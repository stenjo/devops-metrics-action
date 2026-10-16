// The subset of @actions/core used for operational messages, so that neither
// the client nor the metrics need to import the Actions runtime.
export interface Logger {
  info(message: string): void
  warning(message: string): void
}
