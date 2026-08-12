import { useCheckoutSummary } from './useCheckoutSummary';

export function CheckoutSummary() {
  const { checkoutSummary } = useCheckoutSummary();

  return (
    <section>
      <h2>Checkout Summary</h2>
      <p>{checkoutSummary.status}</p>
    </section>
  );
}

export default CheckoutSummary;
