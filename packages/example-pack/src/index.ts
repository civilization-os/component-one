export type ExampleInput = {
  name: string;
};

export type ExampleOutput = {
  message: string;
};

export function createExampleMessage(input: ExampleInput): ExampleOutput {
  const name = input.name.trim();

  if (!name) {
    throw new Error("ExampleInput.name must not be empty.");
  }

  return {
    message: `Hello from ${name}.`
  };
}
