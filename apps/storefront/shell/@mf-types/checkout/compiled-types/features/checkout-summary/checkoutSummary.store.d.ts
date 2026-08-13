export interface CheckoutSummaryState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  setStatus: (status: CheckoutSummaryState['status']) => void;
}
export declare const useCheckoutSummaryStore: import('zustand').UseBoundStore<
  Omit<
    import('zustand').StoreApi<CheckoutSummaryState>,
    'setState' | 'devtools'
  > & {
    setState(
      partial:
        | CheckoutSummaryState
        | Partial<CheckoutSummaryState>
        | ((
            state: CheckoutSummaryState,
          ) => CheckoutSummaryState | Partial<CheckoutSummaryState>),
      replace?: false | undefined,
      action?:
        | (
            | string
            | {
                [x: string]: unknown;
                [x: number]: unknown;
                [x: symbol]: unknown;
                type: string;
              }
          )
        | undefined,
    ): void;
    setState(
      state:
        | CheckoutSummaryState
        | ((state: CheckoutSummaryState) => CheckoutSummaryState),
      replace: true,
      action?:
        | (
            | string
            | {
                [x: string]: unknown;
                [x: number]: unknown;
                [x: symbol]: unknown;
                type: string;
              }
          )
        | undefined,
    ): void;
    devtools: {
      cleanup: () => void;
    };
  }
>;
//# sourceMappingURL=checkoutSummary.store.d.ts.map
