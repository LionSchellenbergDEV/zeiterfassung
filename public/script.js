window.onLoad = setTimeStamp();

function setTimeStamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    document.getElementById("currentTime").innerHTML = time;
    setTimeout(setTimeStamp, 1000);

}