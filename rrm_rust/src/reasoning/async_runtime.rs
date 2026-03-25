use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Waker, RawWaker, RawWakerVTable};

/// Custom Async Minimalist Executor (Zero-Overhead / No Tokio needed)
/// Mengeksekusi Future (Wave Propagation) secara kooperatif di dalam satu thread.
/// Sangat efisien untuk perhitungan matematis berat (FHRR / VSA) yang CPU-bound.
pub struct MiniExecutor {
    tasks: Arc<Mutex<Vec<Pin<Box<dyn Future<Output = ()> + Send>>>>>,
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

            // Ambil task pertama dari antrean
            let mut task = tasks.remove(0);
            drop(tasks); // Lepaskan lock agar task lain bisa di-spawn saat eksekusi

            let waker = dummy_waker();
            let mut context = Context::from_waker(&waker);

            // Polling task (mengeksekusi 1 iterasi gelombang)
            match task.as_mut().poll(&mut context) {
                Poll::Ready(()) => {
                    // Task selesai (Gelombang runtuh / menemukan jawaban)
                }
                Poll::Pending => {
                    // Task belum selesai (Masih merambat), kembalikan ke antrean
                    self.tasks.lock().unwrap().push(task);
                }
            }
        }
    }
}

/// Dummy Waker untuk sinkronisasi Polling di Custom Executor
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

/// Fungsi manual yield untuk Cooperative Multitasking
/// Memaksa Future untuk mengembalikan Poll::Pending agar Executor bisa
/// berpindah mengerjakan gelombang/task lain (Mencegah blocking).
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
