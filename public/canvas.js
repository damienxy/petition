const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

var signatureUrl = "";
var clicking;
var x, y;

// Signature with mouse
$("canvas").on("mousedown", function(e) {
    e.preventDefault();
    clicking = true;
    x = e.offsetX;
    y = e.offsetY;
    context.beginPath();
    context.moveTo(x, y);
});

$("canvas").on("mousemove", function(e) {
    e.preventDefault();
    if (clicking) {
        x = e.offsetX;
        y = e.offsetY;
        context.strokeStyle = "#900";
        context.lineTo(x, y);
        context.stroke();
        signatureUrl = document.getElementById("canvas").toDataURL();
        document.getElementsByName("sign")[0].value = signatureUrl;
    }
});

$(document).on("mouseup", function() {
    clicking = false;
});

// Signature with touchscreen
$("canvas").on("touchstart", function(e) {
    e.preventDefault();
    x = e.touches[0].clientX - $("canvas").offset().left;
    y = e.touches[0].clientY - $("canvas").offset().top;
    context.beginPath();
    context.moveTo(x, y);
    console.log(e.touches[0]);
    console.log(e.touches[0].clientX, e.touches[0].clientY);
});

$("canvas").on("touchmove", function(e) {
    e.preventDefault();
    x = e.touches[0].clientX - $("canvas").offset().left;
    y = e.touches[0].clientY - $("canvas").offset().top;
    context.strokeStyle = "#900";
    context.lineTo(x, y);
    context.stroke();
    console.log(e.touches[0].clientX, e.touches[0].clientY);
    signatureUrl = document.getElementById("canvas").toDataURL();
    document.getElementsByName("sign")[0].value = signatureUrl;
});
