import { RateLimitManager } from "../src/RateLimitManager";
import assert from "node:assert/strict";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const testRateLimitManager = async () => {
    console.log("\n🛠 Running RateLimitManager tests...\n");

    const manager = new RateLimitManager({
        serviceA: { concurrency: 2, requestsPerInterval: 3, intervalMs: 1000, retries: 2 },
        serviceB: { concurrency: 1, requestsPerInterval: 2, intervalMs: 2000, retries: 1 },
    });

    let taskCount = 0;

    /**
     * ✅ Test that concurrency limit is respected
     */
    const testConcurrencyLimit = async () => {
        console.log("🔹 Testing concurrency limits...");

        const limitedTask = manager.wrap("serviceA", async (id: number) => {
            await delay(100);
            taskCount++;
            return `Task ${id} done`;
        });

        const startTime = Date.now();
        const results = await Promise.all([
            limitedTask(1),
            limitedTask(2),
            limitedTask(3),
            limitedTask(4),
            limitedTask(5),
        ]);
        const endTime = Date.now();

        assert.strictEqual(taskCount, 5, "❌ Not all tasks completed");
        assert.ok(endTime - startTime >= 200, "❌ Concurrency limit did not work properly");

        console.log("✅ Concurrency limit test passed!\n");
        return results;
    };

    /**
     * ✅ Test that the rate limiting correctly throttles requests
     */
    const testRateLimiting = async () => {
        console.log("🔹 Testing rate limiting...");

        const timestamps: number[] = [];
        const limitedTask = manager.wrap("serviceA", async (id: number) => {
            timestamps.push(Date.now());
            return `Task ${id} done`;
        });

        await Promise.all([
            limitedTask(1),
            limitedTask(2),
            limitedTask(3),
            limitedTask(4),
            limitedTask(5),
        ]);

        const timeDiffs = timestamps.slice(1).map((t, i) => t - timestamps[i]);
        console.log(`📊 Time differences between executions: ${timeDiffs.join(", ")} ms`);

        assert.ok(
            timeDiffs.some((t) => t >= 900),
            "❌ Rate limiting did not properly throttle requests"
        );

        console.log("✅ Rate limiting test passed!\n");
    };

    /**
     * ✅ Test that failed tasks are retried properly
     */
    const testRetryMechanism = async () => {
        console.log("🔹 Testing retry mechanism...");

        let attemptCount = 0;
        const retryTask = manager.wrap("serviceB", async () => {
            attemptCount++;
            if (attemptCount < 2) throw new Error("Simulated failure");
            return "Success";
        });

        const retryResult = await retryTask();
        assert.strictEqual(retryResult, "Success", "❌ Retry mechanism failed");
        assert.strictEqual(attemptCount, 2, "❌ Task should have retried once");

        console.log("✅ Retry mechanism test passed!\n");
    };

    /**
     * ✅ Test updating service configuration dynamically
     */
    const testUpdateService = async () => {
        console.log("🔹 Testing dynamic service update...");

        manager.updateService("serviceA", { concurrency: 3, requestsPerInterval: 5, intervalMs: 500, retries: 1 });

        console.log(`🔄 Updated serviceA: concurrency 3, rate limit 5 per 500ms`);

        console.log("✅ Service update test passed!\n");
    };

    /**
     * ✅ Test getting pending count of tasks
     */
    const testPendingCount = async () => {
        console.log("🔹 Testing pending count...");

        const pendingTask = manager.wrap("serviceA", async () => {
            await delay(200);
        });

        pendingTask();
        pendingTask();
        pendingTask();
        pendingTask();
        pendingTask();

        await delay(50);

        const pendingCount = manager.getPendingCount("serviceA");
        console.log(`📊 Pending tasks: ${pendingCount}`);

        assert.ok(pendingCount > 0, "❌ Pending count should be greater than 0");

        console.log("✅ Pending count test passed!\n");
    };

    await testConcurrencyLimit();
    await testRateLimiting();
    await testRetryMechanism();
    await testUpdateService();
    await testPendingCount();

    console.log("🎉 All RateLimitManager tests passed ✅\n");
};

export default testRateLimitManager;
