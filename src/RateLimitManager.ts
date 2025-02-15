import pLimit from "p-limit";
import pRetry from "p-retry";
import pThrottle from "p-throttle";

export type RateLimitConfig = {
    concurrency: number;
    requestsPerInterval: number;
    intervalMs: number;
    retries?: number;
};
export class RateLimitManager<Service extends string = string> {
    private limiters: Map<Service, ReturnType<typeof pLimit>>;
    private throttlers: Map<Service, ReturnType<typeof pThrottle>>;
    private configs: Map<Service, RateLimitConfig>;

    constructor(options: Partial<Record<Service, RateLimitConfig>> = {}) {
        this.limiters = new Map();
        this.configs = new Map();
        this.throttlers = new Map();

        for (const [service, config] of Object.entries(options) as [Service, RateLimitConfig][]) {
            this.#addService(service, config);
        }
    }

    /**
     * Wraps an async function with the rate limit and retry logic for the specified service.
     */
    wrap<Args extends unknown[], Return>(
        service: Service,
        fn: (...args: Args) => Promise<Return>
    ): (...args: Args) => Promise<Return> {
        const limiter = this.limiters.get(service);
        const throttler = this.throttlers.get(service);
        const config = this.configs.get(service);

        if (!limiter || !throttler || !config) {
            throw new Error(`No rate limit configured for service: ${service}`);
        }

        return (...args: Args) =>
            limiter(async () =>
                await throttler(() =>
                    pRetry(() => fn(...args), {
                        retries: config.retries ?? 1,
                        onFailedAttempt: (error) => {
                            console.warn(
                                `[${service}] Retry attempt ${error.attemptNumber} failed. ${error.message}`
                            );
                        },
                    })
                )()
            );
    }

    /**
       * Updates the configuration for an existing service.
       */
    updateService(service: Service, config: RateLimitConfig): void {
        if (!this.limiters.has(service)) {
            throw new Error(`No rate limit configured for service: ${service}`);
        }
        this.#addService(service, config);
    }
    /**
     * Returns the number of pending tasks for a service.
     */
    getPendingCount(service: Service): number {
        return this.limiters.get(service)?.pendingCount ?? 0;
    }

    /**
     * Adds a new service with the given configuration.
     */
    #addService<T extends string>(service: T, config: RateLimitConfig): void {
        this.throttlers.set(
            service as unknown as Service,
            pThrottle({
                limit: config.requestsPerInterval,
                interval: config.intervalMs,
            })
        );
        this.limiters.set(service as unknown as Service, pLimit(config.concurrency));
        this.configs.set(service as unknown as Service, config);
    }
}