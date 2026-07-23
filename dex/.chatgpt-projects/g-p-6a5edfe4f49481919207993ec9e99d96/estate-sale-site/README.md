# Estate Sale Collection

Mobile-friendly public catalog and password-protected staff inventory for an estate sale.

- `index.html` is the public, price-free catalog.
- `staff.html` is the internal price and sold-status view.
- `data/internal.enc` contains the encrypted internal inventory.
- Sold status is stored on the current device and can be exported/imported as JSON.

The site is designed for static hosting, including GitHub Pages.

## Publishing

The included GitHub Pages workflow publishes the public catalog whenever `main` changes.

The internal inventory is at `staff.html`. Its price data is encrypted and is not readable without the passphrase. Do not put the passphrase in this repository.
