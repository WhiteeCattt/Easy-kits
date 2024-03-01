export function parseDuration(duration) {
    const timeRegex = /(\d+)(y|w|d|h|m|s)/g;
    let totalMilliseconds = 0;
    let match;
    while ((match = timeRegex.exec(duration)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];
        if (unit === "y") {
            totalMilliseconds += value * 365 * 24 * 60 * 60 * 1000;
        } else if (unit === "w") {
            totalMilliseconds += value * 7 * 24 * 60 * 60 * 1000;
        } else if (unit === "d") {
            totalMilliseconds += value * 24 * 60 * 60 * 1000;
        } else if (unit === "h") {
            totalMilliseconds += value * 60 * 60 * 1000;
        } else if (unit === "m") {
            totalMilliseconds += value * 60 * 1000;
        } else if (unit === "s") {
            totalMilliseconds += value * 1000;
        }
    }
    return totalMilliseconds;
}


export function calculateDuration(duration) {
    const millisecondsPerSecond = 1000;
    const millisecondsPerMinute = 60 * millisecondsPerSecond;
    const millisecondsPerHour = 60 * millisecondsPerMinute;
    const millisecondsPerDay = 24 * millisecondsPerHour;

    const days = Math.floor(duration / millisecondsPerDay);
    duration %= millisecondsPerDay;
    const hours = Math.floor(duration / millisecondsPerHour);
    duration %= millisecondsPerHour;
    const minutes = Math.floor(duration / millisecondsPerMinute);
    duration %= millisecondsPerMinute;
    const seconds = Math.floor(duration / millisecondsPerSecond);

    let durationString = "";
    if (days > 0) {
        durationString += `${days}d `;
    }
    if (hours > 0) {
        durationString += `${hours}h `;
    }
    if (minutes > 0) {
        durationString += `${minutes}m `;
    }
    if (seconds > 0) {
        durationString += `${seconds}s `;
    }
    return durationString.trim();
}
