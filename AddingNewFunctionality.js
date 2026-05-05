// Get all the product cards that have a product code and iterate over them
document.querySelectorAll('.product-card[data-product-code]').forEach((card) => {

  // Skip this card if we already injected a button (prevents duplicates on re-run)
  if (card.querySelector('.gg-add-to-basket-btn')) return;

  // Get the product code from the card's HTML data attribute
  const productCode = card.dataset.productCode;

  // Create the button element
  const button = document.createElement('button');

  // Apply the CSS classes — we copied these directly from the real Wickes PDP
  // button so we get the exact same styles including the green hover effect
  button.className = 'gg-add-to-basket-btn inc_pdp_bundle_cart_summary_add_btn_block';

  // Set the button label
  button.textContent = 'Add to Basket';

  // Inject the styles into the page once — we only do this once no matter
  // how many buttons we create, by checking if the style tag already exists
  if (!document.getElementById('gg-atb-styles')) {
    const style = document.createElement('style');
    style.id = 'gg-atb-styles';
    // These styles were taken directly from the PDP Add to Basket button class
    // inc_pdp_bundle_cart_summary_add_btn_block so it matches Wickes' own design
    style.textContent = `
      .gg-add-to-basket-btn.inc_pdp_bundle_cart_summary_add_btn_block {
        width: 100%;
        height: 40px;
        border: 1px solid #67a509;
        background-color: #67a509;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: row-reverse;
        position: relative;
        transition: all .2s ease;
        color: #fff;
        font-weight: 600;
      }
      /* Hover state inverts the colours — white background, green text */
      .gg-add-to-basket-btn.inc_pdp_bundle_cart_summary_add_btn_block:hover {
        background-color: #fff;
        color: #67a509;
      }
    `;
    document.head.appendChild(style);
  }

  // Listen for click events on the button
  button.addEventListener('click', async () => {

    // Give the user immediate visual feedback that the request is in progress
    button.textContent = 'Adding...';
    button.disabled = true;

    try {
      // Grab the CSRF token Wickes requires on every POST request
      // It can live in a hidden input or a meta tag depending on the page
      const csrfToken =
        document.querySelector('input[name="CSRFToken"]')?.value ||
        document.querySelector('meta[name="CSRFToken"]')?.content;

      // Build the form-encoded payload — this is the exact format
      // Wickes' /cart/add endpoint expects, discovered via the Network tab
      const body = new URLSearchParams({
        productCodePost: productCode,   // the product to add
        qty: '1',                       // quantity
        targetProductCode: productCode, // the specific variant/SKU
        CSRFToken: csrfToken,           // security token required by the server
      });

      // POST to Wickes' add to cart endpoint
      // X-Requested-With tells the server this is an AJAX request
      // so it returns JSON instead of a full HTML page redirect
      const response = await fetch('/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body,
      });

      // Parse the JSON response
      const data = await response.json();

      // Handle both HTTP errors and application-level errors
      // Wickes returns messageType: 'error' for things like out of stock
      if (!response.ok || data.messageType === 'error') {
        throw new Error(data.errorMsg || `Request failed: ${response.status}`);
      }

      // Open the slide-out basket drawer using Wickes' own internal function
      // discovered by inspecting Wick.MiniBasket in the console.
      // It expects the cartPopupHtml string from the response — NOT the full
      // data object. This was the key finding: the function fires a private
      // CustomEvent internally which populates the existing .custom-slider
      // DOM element and triggers the slide-in animation
      Wick.MiniBasketSlider.showProductAddedToCartSlider(data.cartPopupHtml);

      // Show success state on the button
      button.textContent = 'Added ✅';

      // Reset the button after 2 seconds so the user can add again
      setTimeout(() => {
        button.textContent = 'Add to Basket';
        button.disabled = false;
      }, 2000);

    } catch (error) {
      // Log the error for debugging and reset the button so the user can retry
      console.error(error);
      button.textContent = 'Error - try again';
      button.disabled = false;
    }
  });

  // Append the button inside the card's content area if it exists,
  // otherwise fall back to appending directly to the card itself
  const content = card.querySelector('.product-card__content') || card;
  content.appendChild(button);
});