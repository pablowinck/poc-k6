const fs = require('fs');
const readline = require('readline');

// Constants for metric weights
const WEIGHT = {
    POSITIVE: {
        DURATION: 1,
    },
    NEGATIVE: {
        BLOCKED: 0.2,
        FAILED: 0.4,
        CHECK_FAILED: 0.4,
    },
}

// Initialize an object to store metric values
const metrics = {
    http_req_duration: [],
    http_req_blocked: [],
    http_req_check_failed: [],
};

/**
 * Calculate the average of an array of numbers.
 * @param {number[]} arr - The array of numbers
 * @returns {number} - The average value
 */
function calculateAverage(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    return arr.length ? sum / arr.length : 0;
}

/**
 * Normalize a metric value based on a maximum value.
 * @param {number} value - The metric value to normalize
 * @param {number} maxValue - The maximum value for normalization
 * @returns {number} - The normalized value
 */
function normalize(value, maxValue) {
    if (!value) return 0;
    return value / maxValue;
}

function normalizeScoreValue(value, weight) {
    if (!value) return 0;
    const correctValue = value > 1 ? 1 : value;
    return weight * (weight - correctValue) * 100;
}

/**
 * Calculate the final score based on normalized metrics.
 * @param {Object} normalizedMetrics - The object containing normalized metric values
 * @returns {number} - The final score
 */
function calculateScore(normalizedMetrics) {
    console.log({ normalizedMetrics });
    const blocked = normalizeScoreValue(normalizedMetrics.http_req_blocked, WEIGHT.NEGATIVE.BLOCKED);
    const failed = normalizeScoreValue(normalizedMetrics.http_req_failed, WEIGHT.NEGATIVE.FAILED);
    const checkFailed = normalizeScoreValue(normalizedMetrics.http_req_check_failed, WEIGHT.NEGATIVE.CHECK_FAILED);
    const duration = normalizeScoreValue(normalizedMetrics.http_req_duration, WEIGHT.POSITIVE.DURATION);
    const negativeSum = blocked + failed + checkFailed;
    const positiveSum = duration;
    console.log(`+ Duration: ${duration.toFixed(4)}`);
    console.log(`- Blocked: ${blocked.toFixed(4)}`);
    console.log(`- Failed: ${failed.toFixed(4)}`);
    console.log(`- Check Failed: ${checkFailed.toFixed(4)}`);
    console.log(`-- Negative Sum: ${negativeSum.toFixed(4)}`);
    console.log(`++ Positive Sum: ${positiveSum.toFixed(4)}`);

    const result = positiveSum - negativeSum;
    return result < 0 ? 0 : result;
}

// Create a read stream for the metrics file
const fileStream = fs.createReadStream('output.json');
const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

// Read the file line by line and collect metric data
rl.on('line', (line) => {
    try {
        const parsedLine = JSON.parse(line);
        const { type, metric, data } = parsedLine;

        if (type === 'Point' && metrics[metric] !== undefined) {
            metrics[metric].push(data.value);
        }
        if (metric === 'checks' && data.value === 0) {
            metrics['http_req_check_failed'].push(1);
        }
    } catch (err) {
        console.error(`Error parsing line: ${err}`);
    }
});

// After reading the entire file, calculate and display the final score
rl.on('close', () => {
    const avgMetrics = {};
    for (const [metricName, values] of Object.entries(metrics)) {
        avgMetrics[metricName] = calculateAverage(values);
    }

    const normalizedMetrics = {
        http_req_duration: normalize(avgMetrics.http_req_duration, 1000),
        http_req_blocked: normalize(avgMetrics.http_req_blocked, 1000),
        http_req_failed: normalize(avgMetrics.http_req_failed, 1000),
        http_req_connecting: normalize(avgMetrics.http_req_connecting, 1000),
        http_reqs: normalize(avgMetrics.http_reqs, 100),
        http_req_check_failed: normalize(avgMetrics.http_req_check_failed, 100),
    };

    const finalScore = calculateScore(normalizedMetrics);
    console.log(`## Final Score: ${finalScore.toFixed(4)}`);
});
