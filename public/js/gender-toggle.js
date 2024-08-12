document.addEventListener('DOMContentLoaded', function() {
    var genderSelect = document.getElementById('gender');
    
    if (genderSelect) {
        genderSelect.addEventListener('change', function() {
            var gender = this.value;
            var pregnancyField = document.getElementById('pregnancyField');
            var nursingField = document.getElementById('nursingField');

            if (gender === 'female') {
                pregnancyField.style.display = 'block';
                nursingField.style.display = 'block';
            } else {
                pregnancyField.style.display = 'none';
                nursingField.style.display = 'none';
            }
        });

        // Trigger change event on page load to set the correct initial visibility
        genderSelect.dispatchEvent(new Event('change'));
    }
});
