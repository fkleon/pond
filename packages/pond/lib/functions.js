"use strict";
/**
 *  Copyright (c) 2015-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filter = exports.percentile = exports.InterpolationType = exports.stdev = exports.median = exports.difference = exports.last = exports.first = exports.count = exports.min = exports.max = exports.avg = exports.sum = exports.keep = void 0;
const _ = require("lodash");
const util_1 = require("./util");
//
// Functions to process missing values out of a value list
//
/**
 * A pass through filter, keeps the input values just as they were.
 */
const keepMissing = (values) => values;
/**
 * Filters out any missing values (`null`, `undefined` or `NaN`) from the input values
 */
const ignoreMissing = (values) => values.filter(util_1.default.isValid);
/**
 * Replaces any missing value (`null`, `undefined` or `NaN`) with the value `0`
 */
const zeroMissing = (values) => values.map((v) => (util_1.default.isValid(v) ? v : 0));
/**
 * Scans the input values for missing values (`null`, `undefined` or `NaN`) and
 * returns `null` if one or more exist, otherwise returns the original values. An
 * example of doing this might be that you are summing values of events in
 * an hour, but if you are missing any values you don't want do the sum at all,
 * you want to say that for that hour the sum is unknown.
 */
const propagateMissing = (values) => ignoreMissing(values).length === values.length ? values : null;
/**
 * If the input values are an empty array, return `null`, otherwise return
 * the input values.
 */
const noneIfEmpty = (values) => (values.length === 0 ? null : values);
/**
 * Like `first()` except it will return null if not all the values are
 * the same. This can be used to transfer a value when doing aggregation.
 *
 * For instance you might "group by" the 'type', then `avg` the 'value', but
 * you want to results to include the type. So you would `keep()` the type
 * and `avg()` the value.
 */
function keep(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const result = first()(cleanValues);
        cleanValues.forEach((v) => {
            if (v !== result) {
                return null;
            }
        });
        return result;
    };
}
exports.keep = keep;
/**
 * Returns a `sum()` function, i.e. returns a function that takes a list
 * of values and returns their total.
 *
 * Example:
 * ```
 * import { sum } from "pondjs";
 * const aggregationFunction = sum()
 * const result = aggregationFunction([3, 5, 6]) // 14
 * ```
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the sum calculation. Other possibilities are:
 * * `propagateMissing` - which will cause the sum itself to be null if the
 *                        values contain a missing value
 * * `zeroMissing` - will replace missing values with a zero, which for a sum
 *                   is the same as excluding those values
 */
function sum(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return _.reduce(cleanValues, (a, b) => a + b, 0);
    };
}
exports.sum = sum;
/**
 * Returns an `avg()` function. i.e. returns a function that takes a list
 * of values and returns the average of those.
 *
 * Example:
 * ```
 * import { avg } from "pondjs";
 * const aggregationFunction = avg()
 * const result = aggregationFunction([3, 5, 6]) // ~4.66666
 * ```
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the average calculation. Other possibilities are:
 * * `propagateMissing` - which will cause the resulting average to be null if the values
 *                        contain a missing value
 * * `zeroMissing` - will replace missing values with a zero, thus missing values will bring
 *                   the average down
 */
function avg(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const total = _.reduce(cleanValues, (a, b) => {
            return a + b;
        }, 0);
        return total / cleanValues.length;
    };
}
exports.avg = avg;
/**
 * Return a `max()` function.  i.e. returns a function that takes a list
 * of values and returns the average of those.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the maximum search. Other possibilities are:
 * * `propagateMissing` - which will cause the max itself to be null if the values
 *                        contain a missing value
 * * `zeroMissing` - will replace missing values with a zero
 */
function max(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const result = _.max(cleanValues);
        if (_.isFinite(result)) {
            return result;
        }
    };
}
exports.max = max;
/**
 * Return a `min()` function.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the minimum search. Other possibilities are:
 * * `propagateMissing` - which will cause the min itself to be null if the
 *                         values contain a missing value
 * * `zeroMissing` - will replace missing values with a zero
 */
function min(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const result = _.min(cleanValues);
        if (_.isFinite(result)) {
            return result;
        }
    };
}
exports.min = min;
/**
 * Returns a `count()` function.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the count. Other possibilities are:
 * * `propagateMissing` - which will cause the count itself to be null if the
 *                         values contain a missing value
 */
function count(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return cleanValues.length;
    };
}
exports.count = count;
/**
 * Returns a `first()` function, i.e. a function that returns the first
 * value in the supplied values list.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the list, i.e to find the first non-missing value. Other
 * possibilities are:
 * * `keepMissing` - to return the first value, regardless of if it is a missing value or not.
 */
function first(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return cleanValues.length ? cleanValues[0] : undefined;
    };
}
exports.first = first;
/**
 * Returns a `last()` function, i.e. a function that returns the list
 * value in the supplied values list.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the list, i.e to find the last non-missing value. Other
 * possibilities are:
 * * `keepMissing` - to return the last value, regardless of if it is a missing value or not.
 */
function last(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return cleanValues.length ? cleanValues[cleanValues.length - 1] : undefined;
    };
}
exports.last = last;
/**
 * Returns a `difference()` function, i.e. a function that returns
 * the difference between the `min` and `max` values.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the list, i.e to find the last non-missing value. Other
 * possibilities are:
 * * `propagateMissing` - which will cause the min itself to be null if the
 *                         values contain a missing value
 * * `zeroMissing` - will replace missing values with a zero
 */
function difference(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return _.max(cleanValues) - _.min(cleanValues);
    };
}
exports.difference = difference;
/**
 * Returns the `median()` function, i.e. a function that returns
 * the median of the values supplied to it.
 */
function median(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const sorted = cleanValues.sort();
        const i = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            const a = sorted[i];
            const b = sorted[i - 1];
            return (a + b) / 2;
        }
        else {
            return sorted[i];
        }
    };
}
exports.median = median;
/**
 * Returns a function that returns a `stdev()` function, i.e. a function
 * that returns the standard deviation of the values supplied to it.
 */
function stdev(clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        let sums = 0;
        const mean = avg(clean)(cleanValues);
        cleanValues.forEach((v) => (sums += Math.pow(v - mean, 2)));
        return Math.sqrt(sums / values.length);
    };
}
exports.stdev = stdev;
var InterpolationType;
(function (InterpolationType) {
    InterpolationType[InterpolationType["linear"] = 1] = "linear";
    InterpolationType[InterpolationType["lower"] = 2] = "lower";
    InterpolationType[InterpolationType["higher"] = 3] = "higher";
    InterpolationType[InterpolationType["nearest"] = 4] = "nearest";
    InterpolationType[InterpolationType["midpoint"] = 5] = "midpoint";
})(InterpolationType = exports.InterpolationType || (exports.InterpolationType = {}));
/**
 * Returns a `percentile` function within the a values list.
 *
 * The parameters controlling the function:
 *  * `q` - The percentile (should be between 0 and 100), e.g q=75 for 75th percentile.
 *  * `interp` - Specifies the interpolation method to use when the desired
 *    quantile lies between two data points.
 *             Options are:
 *              * linear: i + (j - i) * fraction, where fraction is
 *                the fractional part of the index surrounded by i and j.
 *              * lower: i.
 *              * higher: j.
 *              * nearest: i or j whichever is nearest.
 *              * midpoint: (i + j) / 2.
 *  * `clean` - Strategy to use when encountering missing data:
 *              * `propagateMissing` - which will cause the min
 *                 itself to be null if the values contain a
 *                 missing value
 *              * `zeroMissing` - will replace missing values
 *                 with a zero
 */
function percentile(q, interp = InterpolationType.linear, clean = exports.filter.ignoreMissing) {
    return (values) => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        let v;
        const sorted = cleanValues.slice().sort((a, b) => a - b);
        const size = sorted.length;
        if (q < 0 || q > 100) {
            throw new Error("Percentile q must be between 0 and 100");
        }
        const i = q / 100;
        const index = Math.floor((sorted.length - 1) * i);
        if (size === 1 || q === 0) {
            return sorted[0];
        }
        if (q === 100) {
            return sorted[size - 1];
        }
        if (index < size - 1) {
            const fraction = (size - 1) * i - index;
            const v0 = sorted[index];
            const v1 = sorted[index + 1];
            if (interp === InterpolationType.lower || fraction === 0) {
                v = v0;
            }
            else if (interp === InterpolationType.linear) {
                v = v0 + (v1 - v0) * fraction;
            }
            else if (interp === InterpolationType.higher) {
                v = v1;
            }
            else if (interp === InterpolationType.nearest) {
                v = fraction < 0.5 ? v0 : v1;
            }
            else if (interp === InterpolationType.midpoint) {
                v = (v0 + v1) / 2;
            }
        }
        return v;
    };
}
exports.percentile = percentile;
exports.filter = {
    keepMissing,
    ignoreMissing,
    zeroMissing,
    propagateMissing,
    noneIfEmpty,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Z1bmN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILDRCQUE0QjtBQUc1QixpQ0FBMEI7QUFFMUIsRUFBRTtBQUNGLDBEQUEwRDtBQUMxRCxFQUFFO0FBRUY7O0dBRUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxDQUFDLE1BQWdCLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUVqRDs7R0FFRztBQUNILE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBZ0IsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFeEU7O0dBRUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxDQUFDLE1BQWdCLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRXZGOzs7Ozs7R0FNRztBQUNILE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxNQUFnQixFQUFFLEVBQUUsQ0FDMUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUVuRTs7O0dBR0c7QUFDSCxNQUFNLFdBQVcsR0FBRyxDQUFDLE1BQWdCLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFaEY7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLElBQUksQ0FBQyxLQUFLLEdBQUcsY0FB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