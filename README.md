# Thai Study - Google Sheets Setup

To connect your vocabulary database to this website, follow these simple steps:

### 1. Create your Google Sheet
1.  Open [Google Sheets](https://sheets.new).
2.  Create 4 columns in the first row: `Thai`, `Traditional`, `Pronunciation`, `Category`.
3.  Add your vocabulary words in the rows below.

### 2. Publish to the Web
1.  In your Google Sheet, go to **File** > **Share** > **Publish to web**.
2.  Change "Entire Document" to the specific sheet name (e.g., `Sheet1`).
3.  Change "Web page" to **Comma-separated values (.csv)**.
4.  Click **Publish** and copy the link provided.

### 3. Connect to Website
1.  Open `app.js` in your code editor.
2.  Find the line: `let GOOGLE_SHEET_CSV_URL = '';`
3.  Paste your copied link between the quotes:
    `let GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/.../pub?output=csv';`
4.  Save the file and refresh your website.

Now, every time you add a word to your Google Sheet, it will automatically appear on your website!

