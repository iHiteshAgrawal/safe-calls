# Safe Calls

A simple rate limit and retry manager built on top of `p-limit`, `p-retry`, and `p-throttle`. This library helps you efficiently manage API requests, ensuring compliance with rate limits while providing automatic retries for failed requests.

## Features

- Rate limit API calls per service
- Automatically retry failed requests
- Configurable concurrency and request limits
- Lightweight and easy to use

## Installation

```sh
npm install safe-calls
```

## Usage

### Import and Initialize

```ts
import RateLimitManager from "safe-calls";

const rateLimitManager = new RateLimitManager({
  apiX: {
    concurrency: 2,
    intervalMs: 10000,
    requestsPerInterval: 2,
    retries: 3,
  },
  apiY: {
    concurrency: 5,
    intervalMs: 1000,
    requestsPerInterval: 10,
  },
});
```

### Wrapping API Calls

```ts
async function fetchData() {
  return await fetch("https://api.example.com/data").then((res) => res.json());
}

const wrappedFetch = rateLimitManager.wrap("apiX", fetchData);

wrappedFetch().then((data) => console.log(data));
```

### Handling Multiple Requests

```ts
const tasks = Array.from({ length: 10 }, (_, i) =>
  rateLimitManager.wrap("apiY", async () => {
    console.log(`Fetching item ${i}`);
    return `Item ${i}`;
  })()
);

Promise.all(tasks).then((results) => console.log(results));
```

## Use Cases

### 1. Queue Processing

Use `safe-calls` to manage concurrent job processing in a queue system while ensuring that the jobs do not exceed system constraints.

**Example:**

```ts
const processTask = async (taskId: number) => {
  console.log(`Processing task ${taskId}`);
  return `Task ${taskId} completed`;
};

const taskQueue = Array.from({ length: 50 }, (_, i) =>
  rateLimitManager.wrap("apiX", () => processTask(i))()
);

Promise.all(taskQueue).then((results) =>
  console.log("All tasks completed", results)
);
```

### 2. API Rate Limiting

Prevent exceeding API rate limits by managing request frequency, ensuring compliance with third-party API policies.

**Example:**

```ts
async function fetchApiData() {
  return fetch("https://api.example.com").then((res) => res.json());
}

const limitedFetch = rateLimitManager.wrap("apiX", fetchApiData);

limitedFetch().then(console.log);
```

### 3. Retrying Failed Requests

Automatically retry failed requests with exponential backoff to improve reliability when dealing with intermittent failures.

**Example:**

```ts
async function unstableFetch() {
  if (Math.random() < 0.7) throw new Error("Temporary failure");
  return "Success";
}

const safeFetch = rateLimitManager.wrap("apiX", unstableFetch);

safeFetch().then(console.log).catch(console.error);
```

### 4. Batch Data Processing

Process large datasets in batches with controlled concurrency to optimize resource utilization and performance.

**Example:**

```ts
const processDataBatch = async (batch: number) => {
  console.log(`Processing batch ${batch}`);
  return `Batch ${batch} done`;
};

const batches = Array.from({ length: 10 }, (_, i) =>
  rateLimitManager.wrap("apiX", () => processDataBatch(i))()
);

Promise.all(batches).then(console.log);
```

### 5. Web Scraping

Throttle scraping requests to avoid being blocked while ensuring efficient data extraction from multiple sources.

**Example:**

```ts
async function scrapeWebsite(url: string) {
  return await fetch(url).then((res) => res.text());
}

const limitedScrape = rateLimitManager.wrap("apiY", scrapeWebsite);

limitedScrape("https://example.com").then(console.log);
```

## API Reference

### `new RateLimitManager(config: Partial<Record<Service, RateLimitConfig>>)`

Creates a new rate limit manager with the specified configuration.

### `wrap(service: string, fn: Function): Function`

Wraps an asynchronous function to enforce rate limiting and retries.

### `updateService(service: string, config: RateLimitConfig): void`

Updates the configuration for a given service.

### `getPendingCount(service: string): number`

Returns the number of pending requests for a service.

## Configuration

The `RateLimitConfig` object has the following properties:

| Property              | Type   | Description                                    |
| --------------------- | ------ | ---------------------------------------------- |
| `concurrency`         | number | Maximum number of concurrent executions        |
| `requestsPerInterval` | number | Maximum requests allowed per interval          |
| `intervalMs`          | number | Interval duration in milliseconds              |
| `retries`             | number | (Optional) Number of retry attempts on failure |

## License

MIT

## Repository

[GitHub Repository](https://github.com/iHiteshAgrawal/safe-calls)
