# How to install it
Just clone the repo, run `npm install` and you're ready to go !

# Why from images to a pdf
We all have **A LOT of images** on our (windows) PC. In my case, I wanted to print out my **best memories of each year**, so I thought it would be nice to share the code to automate it.   
In a decent PC, it takes **less than 1 minute to gather 430 photos within a PDF of ~200pages** (2 images per page).

# How it works
Everything is in `create_pdf.js`, and it works with node.
- First, create your folders at the root of the local repo. The **folder name** should be the **year your photos have been taken**. In these folders, paste **ONLY WINDOWS SHORTCUT of your photos**. Note that this is a way to optimize your PC storage, as you **don't have to make a hard copy of your photos**.
- To run it locally, just open a cli and type down `node create_pdf.js` :
     - it will loop over existent files with `.lnk` extension (that stands for windows shortcuts) : the list will be stored in a local file named `final_photos_<YEAR>.txt` with this structure:
       - `path` : full path of the image when following the windows shortcut
       - `birthdate` : the oldest date that exists in the photo EXIF / METADATA (many rules are written in the code to **figure out this date**)
       - `date` : more readable format of `birthdate` (it's in french in my case)
     - it will create a file named `album_<YEAR>.pdf`, in which every image will be displayed (2 images per page). Captions will be the `birthdate`. The images will be sorted accordingly (first taken at the begining, last ones at the end).
- At the end, it saves the PDF locally, at the root of the local repo.

# What you will need to change
You can change all global variables on top of the code, as much as you want.

# Dependencies
- `node`
- `windows-shortcuts`
- `pdf-lib`
- `sharp`
- `exifreader`
