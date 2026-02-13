# Pinewood Derby Report Generator

🏎️ Generate professional PDF reports from Pinewood Derby race data — entirely in your browser.

**[Try it live →](https://bhs128.github.io/pinewood-derby-report/)**

![Screenshot](docs/screenshot.png)

## Features

- **Upload SQLite files** directly from GrandPrix Race Manager
- **Automatic statistics** — averages, best/worst times, excluding slowest heat
- **Professional layout** — matches typical pack report formats
- **Charts** — histograms, slope charts showing racer performance
- **Design awards** — add custom award categories and winners
- **PDF export** — download a print-ready report
- **100% client-side** — your data never leaves your browser

## Quick Start

1. Visit the [live app](https://yourusername.github.io/pinewood-derby-report/)
2. Upload your `.sqlite` file(s) from `Documents/Lisano Enterprises/GrandPrix Race Manager/Data/`
3. Configure your report title, date, and design award winners
4. Preview and export to PDF

## Supported Data

This app works with SQLite databases from:
- **GrandPrix Race Manager** by Lisano Enterprises

The app reads these tables:
- `RegistrationInfo` — racer details
- `RaceChart` — heat results and times
- `Classes` — den/class definitions

## Local Development

```bash
# Clone the repository
git clone https://github.com/bhs128/pinewood-derby-report.git
cd pinewood-derby-report

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Technology Stack

- **React 18** — UI framework
- **Vite** — build tool
- **sql.js** — SQLite in the browser (WebAssembly)
- **Chart.js** — data visualization
- **jsPDF + html2canvas** — PDF generation
- **Tailwind CSS** — styling

## Privacy

Your race data is processed **entirely in your browser**. Files are never uploaded to any server. The app works completely offline once loaded.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Known Class Names

The app recognizes these class/den names and assigns appropriate colors:
- Lion Den / Lions
- Tiger Den / Tigers
- Wolf Den / Wolves
- Bear Den / Bears
- Webelos Den / Webelos
- Arrow of Light / AOL
- Grand Finals

Custom class names are supported but may use default styling.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Cub Scouts BSA** for the amazing Pinewood Derby tradition
- **Lisano Enterprises** for GrandPrix Race Manager
- The open source community for the libraries that make this possible

---

Made with ❤️ for Cub Scout packs everywhere

[View on GitHub](https://github.com/bhs128/pinewood-derby-report)
