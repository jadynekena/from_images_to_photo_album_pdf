import { readdir, readFileSync, writeFileSync, statSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import ws  from 'windows-shortcuts';
import sharp from 'sharp';
import ExifReader from 'exifreader';


/************************************* BEGINING OF GLOBAL VARIABLES ***********************************/

const PAGE_WIDTH = 600
const PAGE_HEIGHT = 800
const PAGE_MARGIN = 40
const ROUNDED_CORNER = 15

const CURRENT_YEAR = '2014'
const IMAGE_TEST = 'E:\\ALBUMS\\2017\\IMG_20170919_104225.jpg'
const IMG_REFERENCE = IMAGE_TEST.split('\\').at(-1) // DON'T CHANGE THIS


/************************************* END OF GLOBAL VARIABLES ***********************************/

//test()
//test2()
main()

async function test(){

	const year = CURRENT_YEAR
	const pdfDoc = await init_pdf('test')	

	sharp(IMAGE_TEST)
		  .png()
		  .toBuffer()
		  .then(data => sharp(data).jpeg().toBuffer())
		  .then(data => console.log('Processed'))
		  .catch(err => console.error('Error:', err));

	await append_a_new_image(pdfDoc, IMAGE_TEST, 'ceci est un test')	
	await save_pdf(pdfDoc, 'TEST')

}

async function test2(){
	const photo_path = IMAGE_TEST
	const date_photo = await get_oldest_date(photo_path);
	console.log(date_photo);
}


async function main(){
	album_annee(CURRENT_YEAR)
}

async function album_annee(year){

	const dir = './'+year

	
	const pdfDoc = await init_pdf(year)	
	let final_photos = []

	//open the folder
	readdir(dir, function (err, data){

		if(data.length === 0) return console.log('No files found.')

		//get all files paths
		const paths = data.map(e => dir + '/' + e)

		//for each filepath
		for (let i = 0; i < paths.length; i++) {
			const current_path = paths[i]

			//resolve to real filepath (target if .lnk)
			if(current_path.includes('.lnk')){
				ws.query(current_path, async function(err, real_path){

				  	if (err) throw err;

					const one_file = {}

					const real_path_target = real_path.target

					//get birthdate of the image
					const final_date = await get_oldest_date(real_path_target)
					if(real_path_target.includes(IMG_REFERENCE)){
						console.log('\n\n\n\n',{real_path_target})
						console.log({final_date})
						console.log('\n\n\n\n')
					}

				  	one_file['path'] = real_path_target
				  	one_file['birthdate'] = final_date
				  	one_file['date'] = format_timestamp(one_file['birthdate'])

				  	final_photos.push(one_file)

					if(real_path_target.includes(IMG_REFERENCE)){
						console.log({one_file})
					}

					if(final_photos.length === 0) return console.log('No `.lnk` files found.')

					if(final_photos.length >= paths.length){
						console.log('>>>>>>>>>>>>>>>>>>> LAST HERE')						

						// On last one => process sorting from 1st to last of the current year
						final_photos = await sortByKey(final_photos, 'birthdate')
						writeFileSync('final_photos_'+year+'.txt', JSON.stringify(final_photos, null, 2));

						//console.log({final_photos})

						//for each filepath
						let current_page = null
						for (let new_i = 0; new_i < final_photos.length; new_i++) {
							try{
								const one_file = final_photos[new_i]
								console.log({new_i, one_file})
								

								// each time new_i is odd, (1, 3, 5, ...) => use same page as before
								if(oddOrEven(new_i) === 'odd'){
									try{
										await append_a_new_image(pdfDoc, one_file['path'], one_file['date'], current_page, PAGE_MARGIN)	
									}catch(error){
										console.error({error})
									}
								}else{
									try{
										current_page = await append_a_new_image(pdfDoc, one_file['path'], one_file['date'])		
									}catch(error){
										console.error({error})
									}
									
								}
							}catch(error){
								console.error({error})
							}
						}

						// last page
						await add_page_with_text_only(pdfDoc, "Merci Seigneur pour cette année "+year+".", 16)
						await save_pdf(pdfDoc, year)
					}




				})			
			}

		} 
						

	}); 


}

async function get_oldest_date(photo_path) {


	const stats = statSync(photo_path)
	const stats_array = [stats.mtimeMs, stats.birthtimeMs, stats.ctimeMs, stats.atimeMs]
	//console.log({stats_array})

	const epoch_from_stats = Math.min(... stats_array)
	//console.log({epoch_from_stats})


	let tags = {}
	try{
		tags = await ExifReader.load(photo_path)	
		//console.log({tags})
	}catch(err){
		tags = {}
	}
	
	const exifreadear_array = [get_value_of(tags,'CreateDate'), get_value_of(tags,'CreationTime'), get_value_of(tags,'Creation Time'), get_value_of(tags,'DateAcquired'), get_value_of(tags,'DateTimeOriginal')].flat().sort()
	console.log({exifreadear_array})

	const oldest_date = coalesce(exifreadear_array)
	const oldest_date_as_epoch_from_exif_reader = oldest_date ? convert_to_epoch(oldest_date) : null

	const final_array_to_compare = [epoch_from_stats, oldest_date_as_epoch_from_exif_reader].filter(e => e).flat()
	console.log({photo_path, final_array_to_compare})

	return Math.min(... final_array_to_compare)
	
}

function convert_to_epoch(s){
    if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
        const [date, time] = s.split(' ');
        const [year, month, day] = date.split(':');
        return new Date(`${year}-${month}-${day}T${time}Z`).getTime();
    } 
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
        return new Date(s).getTime();
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(s)) {
        return new Date(s).getTime();
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(s)) {
	    return new Date(s).getTime();
	}
    return NaN;
};

function get_value_of(tags, key){
	return tags[key] && tags[key]['value'] ? tags[key]['value'] : null
}

function coalesce(list_of_values){
	const first_non_empty_value = list_of_values.find(e => e) 
	return first_non_empty_value
}

function oddOrEven(x) {
  return ( x & 1 ) ? "odd" : "even";
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

async function init_pdf(year){
	const pdfDoc = await PDFDocument.create();

	// Create the first page with "YEAR 2016"
	await add_page_with_text_only(pdfDoc, 'Année ' + year, 50)

	return pdfDoc
}

async function add_page_with_text_only(pdfDoc, text, text_size){
	const new_page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	return await append_text(pdfDoc, new_page, text, text_size)
}

async function append_text(pdfDoc, page, text, text_size){
	const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);	
	const textWidth = helveticaFont.widthOfTextAtSize(text, text_size);
	const textHeight = helveticaFont.heightAtSize(text_size);

	page.drawText(text, {
	  x: page.getWidth() / 2 - textWidth / 2,
	  y: page.getHeight() / 2 - textHeight / 2,
	  size: text_size
	});

	return page
}


async function append_a_new_image(pdfDoc, imagePath, caption, current_page, y_position_from_current_page) {
	
	// New image
	const new_page = await add_page_of_image(pdfDoc, imagePath, caption, current_page, y_position_from_current_page)
	

	return new_page
}

async function save_pdf(pdfDoc, year){

	// Save the PDF to variable
	const pdfBytes = await pdfDoc.save();
	const album_name = 'album_' + year + '.pdf'

	//output it if it's last
	writeFileSync(album_name, pdfBytes);

	console.log('saved as '+album_name+'.')
}

function extension(imagePath){
	return imagePath.split('.')[1].toLowerCase()
}

async function add_page_of_image(pdfDoc, imagePath, caption, current_page, y_position_from_current_page){
	

	// Create a new page with the image
	if(!current_page){
		current_page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	}

	const taille_initiale = await initial_image_dimensions(imagePath) //format {width, height}
	const { width, height } = get_final_image_dimensions(imagePath,taille_initiale);
	const x_position = Math.max( PAGE_MARGIN, (PAGE_WIDTH-width)/2)
	const y_position = y_position_from_current_page || (PAGE_HEIGHT-height-PAGE_MARGIN)

	//console.log({x_position, y_position})

	// Retrieve the image and embed it
	const imageBytes = await processImage(imagePath, width, height)
	const image = await pdfDoc.embedPng(imageBytes) 
	current_page.drawImage(image, { x: x_position, y: y_position, width, height });

	// Add to this page the date of the file
	current_page.drawText(caption, { x: x_position, y: (y_position-12), size: 12 });

	return current_page
}

async function initial_image_dimensions(imagePath) {
    const image = sharp(imagePath);

    // Apply rotation based on EXIF data and then retrieve the dimensions
    const rotatedImage = await image.rotate().toBuffer();
    
    // Get the dimensions of the rotated image
    const { width, height } = await sharp(rotatedImage).metadata();

    return { width, height };
}

function get_final_image_dimensions(image_path, image_size){
	let width = image_size.width
	let height = image_size.height
	let scale_factor = 1

	if(image_path.includes(IMG_REFERENCE)) console.log('before', { width, height } )

	//make height fit to PAGE_HEIGHT/2, and change width accordingly (to keep the right scale)
	if(height > ((PAGE_HEIGHT - (PAGE_MARGIN*3))/2)){
		scale_factor = ((PAGE_HEIGHT - (PAGE_MARGIN*3))/2)/height
	}

	width = Number((width * scale_factor).toFixed(0))
	height = Number((height * scale_factor).toFixed(0))
	if(image_path.includes(IMG_REFERENCE)) console.log('after', { width, height } )

	return { width , height } 
}

async function processImage(imagePath, width, height) {
    const blend = 'dest-in'
	const mask = Buffer.from(
	  `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${ROUNDED_CORNER}" ry="${ROUNDED_CORNER}" /></svg>`
	);

    const imageBuffer = readFileSync(imagePath);

    // Get image metadata to determine its format
    const metadata = await sharp(imageBuffer).rotate().metadata();

    // Process the image into png before applying mask
    const processedImage = await sharp(imageBuffer)
            .rotate() // Corrects the orientation based on EXIF data
            .resize({ width, height }) // Resize the image
            .toFormat('png')
            .composite([{
			    input: mask,
			    blend: blend
			}])
            .toBuffer();

    return processedImage;
}



function format_timestamp(ts) {
  const date_obj = new Date(ts);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${days[date_obj.getDay()]} ${date_obj.getDate()} ${months[date_obj.getMonth()]} ${date_obj.getFullYear()} à ${date_obj.getHours()}:${('0' + date_obj.getMinutes()).slice(-2)}`;
}
