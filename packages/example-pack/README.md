# @civilization-os/example-pack

A minimal isolated package template for `component-one`.

This package is private and is not intended to be published. Use it as a reference when creating real component packages.

## Install

This example package is not published to npm.

## Usage

```ts
import { createExampleMessage } from "@civilization-os/example-pack";

const message = createExampleMessage({ name: "component-one" });
```

## API

### `createExampleMessage(input)`

Creates a short example message.

Input:

```ts
type ExampleInput = {
  name: string;
};
```

Output:

```ts
type ExampleOutput = {
  message: string;
};
```
