module.exports = {
    isEmpty: function(obj) {
        if (Object.prototype.toString.call(obj) === "[object Object]") {
            if (Object.keys(obj).length) {
                return false;
            } else {
                return true;
            }
        } else if (Object.prototype.toString.call(obj) === "[object Array]") {
            if (obj.length) {
                return false;
            } else {
                return true;
            }
        } else {
            if (obj) {
                return false;
            } else {
                return true;
            }
        }
    },
    objMerge: function(obj, src) {
        Object.keys(src).forEach(function(key) {
            if (key) {
                key = key.toString();
                obj[key] = src[key];
            }
        });
        return obj;
    },
    isExists: function(item, container) {
        if (Object.prototype.toString.call(container) === "[object Object]") {
            return (item in container);
        } else if (Object.prototype.toString.call(container) === "[object Array]") {
            return (container.indexOf(item) > -1);
        } else {
            return false;
        }
    },
    flatten: function(arr) {
        const flat = [].concat(...arr);
        return flat.some(Array.isArray) ? flatten(flat) : flat;
    },
    getSubscribedUsers: function(group_ids, subscriptions, callback) {
        if (!group_ids) callback("Group_ids are null or undefined", null);
        if (!subscriptions) callback("Subscriptions are null or undefined", null);
        var users = [];
        for (var itr in subscriptions) {
            if ((group_ids.indexOf(itr) > -1)) {
                if (subscriptions[itr].user_id) {
                    users.push(subscriptions[itr].user_id);
                }
            }
        }
        callback(null, users);
    },
    getRefreshPage: function(excludedPage, pageArr) {
        var index = pageArr.indexOf(excludedPage);
        return pageArr[(pageArr.length - 1) - index];
    }
};