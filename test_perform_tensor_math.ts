import assert from 'node:assert';
import { TensorFlowEngine } from './engine.ts';

async function testPerformTensorMath() {
  console.log("🧪 Testing TensorFlowEngine.performTensorMath...");

  // Test Case 1: Mismatched Dimensions (The requested edge case)
  const a = [1, 2, 3];
  const b = [4, 5];
  const resultMismatched = TensorFlowEngine.performTensorMath(a, b, 'add');

  assert.strictEqual(resultMismatched.ok, false, "Should return Err for mismatched dimensions");
  assert.ok(resultMismatched.error?.includes("Dimensi tidak cocok"), "Error message should mention dimension mismatch");
  console.log("✅ Case 1: Mismatched dimensions handled correctly.");

  // Test Case 2: Happy Path - Add
  const a2 = [1, 2, 3];
  const b2 = [4, 5, 6];
  const resultAdd = TensorFlowEngine.performTensorMath(a2, b2, 'add');

  assert.strictEqual(resultAdd.ok, true, "Should return Ok for valid addition");
  if (resultAdd.ok) {
    assert.deepStrictEqual(resultAdd.value.result, [5, 7, 9], "Addition result mismatch");
    assert.deepStrictEqual(resultAdd.value.shape, [3], "Addition shape mismatch");
  }
  console.log("✅ Case 2: Addition works correctly.");

  // Test Case 3: Happy Path - Sub
  const resultSub = TensorFlowEngine.performTensorMath(a2, b2, 'sub');
  assert.strictEqual(resultSub.ok, true);
  if (resultSub.ok) {
    assert.deepStrictEqual(resultSub.value.result, [-3, -3, -3]);
  }
  console.log("✅ Case 3: Subtraction works correctly.");

  // Test Case 4: Happy Path - Mul
  const resultMul = TensorFlowEngine.performTensorMath(a2, b2, 'mul');
  assert.strictEqual(resultMul.ok, true);
  if (resultMul.ok) {
    assert.deepStrictEqual(resultMul.value.result, [4, 10, 18]);
  }
  console.log("✅ Case 4: Multiplication works correctly.");

  // Test Case 5: Happy Path - Div
  const resultDiv = TensorFlowEngine.performTensorMath(b2, a2, 'div');
  assert.strictEqual(resultDiv.ok, true);
  if (resultDiv.ok) {
    assert.deepStrictEqual(resultDiv.value.result, [4, 2.5, 2]);
  }
  console.log("✅ Case 5: Division works correctly.");

  // Test Case 6: Happy Path - Dot
  const resultDot = TensorFlowEngine.performTensorMath(a2, b2, 'dot');
  assert.strictEqual(resultDot.ok, true);
  if (resultDot.ok) {
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    assert.strictEqual(resultDot.value.result, 32);
    assert.deepStrictEqual(resultDot.value.shape, []);
  }
  console.log("✅ Case 6: Dot product works correctly.");

  // Test Case 7: Invalid Operation
  // @ts-ignore: Testing invalid operation
  const resultInvalid = TensorFlowEngine.performTensorMath(a2, b2, 'invalid');
  assert.strictEqual(resultInvalid.ok, false);
  assert.ok(resultInvalid.error?.includes("Operasi tidak dikenal"), "Error message should mention unknown operation");
  console.log("✅ Case 7: Invalid operation handled correctly.");

  console.log("\n✨ All tests for performTensorMath passed!");
}

testPerformTensorMath().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
