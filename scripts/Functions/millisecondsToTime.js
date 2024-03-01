export function millisecondsToTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    let result = "";
    if (days > 0) {
        result += days + "d ";
    }
    if (hours > 0) {
        result += hours + "h ";
    }
    if (minutes > 0) {
        result += minutes + "m ";
    }
    if (seconds > 0 || result === "") {
        result += seconds + "s";
    }
    return result.trim();
}
