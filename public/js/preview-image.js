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
});