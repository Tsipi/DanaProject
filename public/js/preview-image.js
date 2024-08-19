document.addEventListener('DOMContentLoaded', function() {
    function previewImage(event) {
        const reader = new FileReader();
        reader.onload = function() {
            const imagePreview = document.getElementById('imagePreview');
            const imagePlaceholder = document.getElementById('imagePlaceholder');

            imagePreview.src = reader.result; // Set the preview image source to the uploaded file
            imagePreview.style.display = 'block'; // Show the image preview
            imagePlaceholder.style.display = 'none'; // Hide the placeholder
        }
        reader.readAsDataURL(event.target.files[0]);
    }

    // Attach the event listener to the file input
    const imageInput = document.getElementById('image');
    imageInput.addEventListener('change', previewImage);

     // Ensure the image is visible if already set on the form load
     const existingImage = document.getElementById('imagePreview').src;
     if (existingImage && existingImage !== '#') {
         document.getElementById('imagePreview').style.display = 'block';
         document.getElementById('imagePlaceholder').style.display = 'none';
     }
});