use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Waker, RawWaker, RawWakerVTable};

type TaskBox = Pin<Box<dyn Future<Output = ()> + Send>>;

/// Custom Async Minimalist Executor (Zero-Overhead / No Tokio needed)
/// Mengeksekusi Future (Wave Propagation) secara kooperatif di dalam satu thread.
/// Sangat efisien untuk perhitungan matematis berat (FHRR / VSA) yang CPU-bound.
#[derive(Default, Clone)]
pub struct MiniExecutor {
    tasks: Arc<Mutex<Vec<TaskBox>>>,
}

impl MiniExecutor {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + Send + 'static
    {
        self.tasks.lock().unwrap().push(Box::pin(future));
    }

    pub fn run(&self) {
        loop {
            let mut tasks = self.tasks.lock().unwrap();
            if tasks.is_empty() { break; }

            let mut task = tasks.remove(0);
            drop(tasks);

            let waker = dummy_waker();
            let mut context = Context::from_waker(&waker);

            match task.as_mut().poll(&mut context) {
                Poll::Ready(()) => {}
                Poll::Pending => {
                    self.tasks.lock().unwrap().push(task);
                }
            }
        }
    }
}

fn dummy_waker() -> Waker {
    unsafe fn clone(_: *const ()) -> RawWaker {
        RawWaker::new(std::ptr::null(), &VTABLE)
    }
    unsafe fn wake(_: *const ()) {}
    unsafe fn wake_by_ref(_: *const ()) {}
    unsafe fn drop(_: *const ()) {}

    static VTABLE: RawWakerVTable = RawWakerVTable::new(clone, wake, wake_by_ref, drop);
    unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) }
}

pub fn async_yield() -> impl Future<Output = ()> {
    struct YieldFuture(bool);
    impl Future for YieldFuture {
        type Output = ();
        fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> {
            if self.0 {
                Poll::Ready(())
            } else {
                self.0 = true;
                cx.waker().wake_by_ref();
                Poll::Pending
            }
        }
    }
    YieldFuture(false)
}
