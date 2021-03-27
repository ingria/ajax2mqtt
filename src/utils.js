/**
 * Returns object diff (assuming keys are the same).
 * @param  {Object} obj1
 * @param  {Object} obj2
 * @return {Object}
 */
export const objdiff = function objectShallowDiff(obj1, obj2) {
    const diff = {};
    let nothingChanged = true;

    Object.entries(obj2).forEach(([key, value]) => {
        if (value !== obj1[key]) {
            diff[key] = value;
            nothingChanged = false;
        }
    });

    return nothingChanged ? null : diff;
};
