/**
 * @module helpers
 *
 * Helper functions used by the module
*/

/**
 * Perform a binary search on an array to find the index of the smallest element y such
 * that y >= x.
 *
 * @param {Array.T} - arr
 * @param {U} - element
 * @param {T -> U} trans - transform the elements of the array to compare with element
 *                         if not provided, then it's the identity
 *
 * @example binarySearch([0, 1, 2, 3, 4], 0.5) // == 1
 * @example binarySearch([0, 1, 2, 3, 4], 0)   // == 0
 * @example binarySearch([0, 1, 2, 3, 4], -1)  // == 0
 * @example binarySearch([0, 1, 2, 3, 4], 100) // == 5
 *
 * @return {index}
*/
function binarySearch(arr, x, trans) {//{{{
    if(typeof trans === 'undefined') trans = function(x) { return x; }
    var m = 0;
    var M = arr.length - 1;
    var mid;

    while(m <= M) {
        mid = m + Math.round((M - m) / 2);

        if(trans(arr[mid]) - x == 0) {
            return mid;
        } else if(trans(arr[mid]) - x < 0) {
            m = mid + 1;
        } else if(trans(arr[mid]) - x > 0){
            M = mid - 1;
        }
    }

    mid = Math.min(Math.max(0, mid), arr.length-1);
    var i1 = Math.max(0, mid - 1);
    var i2 = mid; // i2 >= i1

    if (trans(arr[i1]) - x > 0) {
        return i1;
    } else {
        if(trans(arr[i2]) - x > 0) return i2;
        else return i2 + 1;
    }
}//}}}


/*
 * Generate from an object a string that can be appended to an xml tag
 * to add attributes to it.
 *
 * Example:
 *
 * dict2attributes({ width: 200, src: 'script.js' });
 *
 * produces the string "width='200' src='script.js'"
 *
 * @param {Object} attributes - preferably 1D.
 *
 * @return {String}
*/
function dict2attributes(attributes) {//{{{
    return Object.keys(attributes).map(function(attr) {
        return attr + '= "' + attributes[attr] + '"';
    }).join(' ');
}//}}}


/**
 * A helper function that extends obj1 with obj2 and returns the output.
 *
 * This functions builds the smallest object o that satisfies the property:
 * forall k in keys(o), k in keys(obj2) -> o[k] = obj2[k],
 *                      k in keys(obj1) and k not in keys(obj2) -> o[k] = obj1[k]
 *
 * @param {Object} obj1 - starting obj
 * @param {Object} obj2 - extending obj
 *
 * @return {Object}
*/
function extendObjs(obj1, obj2) {//{{{
    var obj = {};
    for(var k in obj1) obj[k] = obj1[k];
    for(var k in obj2) obj[k] = obj2[k];
    return obj;
}//}}}



module.exports = {
    binarySearch: binarySearch,
    dict2attributes: dict2attributes,
    extendObjs: extendObjs,
}
