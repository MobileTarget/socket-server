
var helper = require('../helpers'),
    async = require('async'),
    numUsers = 0,
    connectedUsers = {},
    subscriptions = {};

/**
 * The following function are used globally in this file
 * as a handy method for code reusable and make the module
 * code pretty and short. 
 */

function saveAndUpdatePageIdInSubscriptions(local_subscriptions, local_obj) {
    if (helper.isEmpty(local_obj)) {
        console.log("When local_obj is null or empty");
        return local_subscriptions;
    }

    if (local_obj.current_page_id !== 1) {
        if (helper.isExists(local_obj.current_page_id, local_subscriptions)) { //when subscription page is alraedy exits
            if (helper.isEmpty(local_subscriptions) || helper.isEmpty(local_obj.user_id) || helper.isEmpty(local_obj.fingerPrint)) {

                if (helper.isEmpty(local_subscriptions)) return {};
                return local_subscriptions;
            } else {
                if (helper.isExists(local_obj.fingerPrint, local_subscriptions[local_obj.current_page_id])) { //if user is exists them merge into subscription object user page_id 
                    return local_subscriptions;
                } else {
                    var temp_obj = {},
                        temp_obj1 = {};
                    temp_obj[local_obj.user_id] = {
                        user_id: local_obj.user_id,
                        last_seen: new Date().getTime()
                    };

                    temp_obj1[local_obj.fingerPrint] = temp_obj;
                    console.log("local subscription >>>.", local_subscriptions);
                    helper.objMerge(local_subscriptions[local_obj.current_page_id], temp_obj1);
                    return local_subscriptions;
                }
            }
        } else { //when subscription object is totally empty. Bascally for initial start case...
            var custom_obj = {},
                temp_obj = {};

            custom_obj[local_obj.user_id] = {
                user_id: local_obj.user_id,
                last_seen: new Date().getTime()
            };
            temp_obj[local_obj.fingerPrint] = custom_obj;
            local_subscriptions[local_obj.current_page_id] = temp_obj;
            return local_subscriptions;
        }
    } else {
        if (helper.isEmpty(local_subscriptions)) return {};
        return local_subscriptions;
    }
}

function saveAndUpdateGroupIdsToSubscriptions(subscriptions, obj) {
    if (helper.isEmpty(obj)) return subscriptions;

    if (!helper.isEmpty(obj.group_ids)) {
        var group_ids = obj.group_ids;
        for (var itr in group_ids) {
            if (helper.isEmpty(subscriptions)) {
                var custom_obj = {};
                custom_obj[group_ids[itr]] = {
                    group_id: group_ids[itr],
                    user_id: obj.user_id,
                    last_seen: new Date().getTime()
                };
                subscriptions[group_ids[itr]] = custom_obj;
            } else {
                if (!helper.isExists(group_ids[itr], subscriptions[group_ids[itr]])) {
                    var exiting_obj = {};
                    exiting_obj = {
                        group_id: group_ids[itr],
                        user_id: obj.user_id,
                        last_seen: new Date().getTime()
                    };
                    subscriptions[group_ids[itr]] = exiting_obj;
                }
            }
        }
        return subscriptions;
    } else {
        return subscriptions;
    }
}

function populateSubscribedUsers(local_obj, localConnectedUsers) {
    var localIdentifier = local_obj.identifier,
        user_id = local_obj.user_id,
        users = [];

    for (var fingerPrints in localConnectedUsers) {
        for (var connected in localConnectedUsers[fingerPrints]) {
            if (connected !== user_id) {
                if (!helper.isEmpty(localConnectedUsers[fingerPrints][connected])) {
                    if (localConnectedUsers[fingerPrints][connected].identifier.toString() == localIdentifier.toString()) {
                        users.push(fingerPrints);
                    }
                }
            }
        }
    }
    return users;
}

function updateConnectedUserWithPages(obj, callback) {
    var user_id = obj.user_id,
        page_ids = obj.page_ids,
        group_ids = obj.group_ids,
        connectedUsers = obj.connectedUsers;

    helper.getSubscribedUsers(group_ids, subscriptions, function(err, users) { //this code is used to send data to Assistants only
        if (err) console.log("Error while populating subscribedUser from subscription object", err);

        for (var fingerPrints in connectedUsers) {
            for (var connected in connectedUsers[fingerPrints]) {
                if (connected !== user_id) {
                    if (helper.isExists(connected, users)) {
                        connectedUsers[fingerPrints][connected].updatedPages = page_ids;
                    }
                }
            }
        }
    });

    console.log("connctedUsers in updateConnectedUserWithPages method", connectedUsers);
    callback(null, connectedUsers);
}

function Logger(obj1, obj2, type, object) {

    if (object !== undefined) {
        var logger = {
            user_id: object.socket_session.user_id,
            current_page_id: object.current_page_id,
            identifier: object.identifier,
            subscription: object.subscription_ids,
            outbound_message: object.outbound_message
        };
        console.log("if case before logger values are as follows", obj1, obj2, type, logger);
    } else {
        console.log("else case before logger values are as follows", obj1, obj2, type, object);
    }

}

function Logger2(obj1, obj2, type, object) {
    if (object !== undefined) {
        var users = [];
        for (var key in object) {
            users.push({
                user_id: object[key].socket_session.user_id,
                current_page_id: object[key].current_page_id,
                identifier: object[key].identifier,
                subscription: object[key].subscription_ids,
                outbound_message: object[key].outbound_message
            });
        }
        console.log("if case before logger values are as follows", obj1, obj2, type, users);
    } else {
        console.log("else case before logger values are as follows", obj1, obj2, type, object);
    }
}

module.exports = function(io) {
    console.log("default global variable values are as follows \n", numUsers, connectedUsers, subscriptions);


    io.on('connection', function(socket) {
        var addedUser = false;

        // when the client emits 'new message', this listens and executes
        socket.on('new message', function(data) {
            // we tell the client to execute 'new message'
            socket.broadcast.emit('new message', {
                username: socket.username,
                message: data
            });
        });

        // when the client emits 'add user', this listens and executes
        socket.on('add user', function(username) {
            if (addedUser) return;

            // we store the username in the socket session for this client
            socket.username = username;
            ++numUsers;
            addedUser = true;
            socket.emit('login', {
                numUsers: numUsers
            });
            // echo globally (all clients) that a person has connected
            socket.broadcast.emit('user joined', {
                username: socket.username,
                numUsers: numUsers
            });
        });

        // when the client emits 'typing', we broadcast it to others
        socket.on('typing', function() {
            socket.broadcast.emit('typing', {
                username: socket.username
            });
        });

        // when the client emits 'stop typing', we broadcast it to others
        socket.on('stop typing', function() {
            socket.broadcast.emit('stop typing', {
                username: socket.username
            });
        });

        // when the user disconnects.. perform this
        socket.on('disconnect', function(socket) {
            console.log("socket on disconnect >>", socket);
            if (addedUser) {
                --numUsers;

                // echo globally that this client has left
                socket.broadcast.emit('user left', {
                    username: socket.username,
                    numUsers: numUsers
                });
            }
            //following code is used for todooffline app.
            if (socket.user_id) {
                delete connectedUsers[socket.user_id];
                console.log("Socket is going to disconnect.");
            }
        });

        /**
         * Following code is used to check whether the given page_id is exits in 
         * subscriptions or not if subscriptions is empty then create the object with 
         * page_id key if already present then update that page with new users who 
         * visit that page .
         * { 
         *       deviceType: 'Android Device',
         *       fingerPrint: 2958713207,
         *       user_id: 'shjkrUba5kBInrv6wQZwZaoOxbZLDVsi',
         *       group_ids: [],
         *       identifier: 'Categories',
         *       subcription_ids: 2,
         *       current_page_id: 2,
         *       outbound_message: null 
         *  }
         */

        socket.on('$onAppResume$event', function(obj) {
            console.log("$onAppResume$event triggers...", obj);
            if (helper.isExists(obj.fingerPrint, connectedUsers)) {
                if (helper.isExists(obj.user_id, connectedUsers[obj.fingerPrint])) {
                    connectedUsers[obj.fingerPrint][obj.user_id].socket_session = socket;
                    connectedUsers[obj.fingerPrint][obj.user_id].current_page_id = obj.current_page_id;
                    connectedUsers[obj.fingerPrint][obj.user_id].identifier = obj.identifier;
                }
            } else {
                if (!helper.isEmpty(obj.fingerPrint) && !helper.isEmpty(obj.user_id)) {
                    socket.user_id = obj.user_id;
                    var temp_obj1 = {};
                    temp_obj1[obj.user_id] = {
                        device_type: obj.deviceType,
                        fingerPrint: obj.fingerPrint,
                        socket_session: socket,
                        identifier: obj.identifier,
                        subscription_ids: [obj.user_id, obj.subcription_ids, obj.current_page_id],
                        current_page_id: obj.current_page_id,
                        outbound_message: obj.outbound_message,
                        last_seen: new Date().getTime()
                    };
                    connectedUsers[obj.fingerPrint] = temp_obj1;
                }
            }
            subscriptions = saveAndUpdatePageIdInSubscriptions(subscriptions, obj);
            subscriptions = saveAndUpdateGroupIdsToSubscriptions(subscriptions, obj);
        });

        /**
         * The following function is invoked when any page changes on mobile page.
         * when user moves from one page to another page. This socket event is trigger
         * each time and create/update the subscription object with the current_page_id,
         * for that user.
         * { 
         *       deviceType: 'Android Device',
         *       fingerPrint: 2958713207,
         *       user_id: 'shjkrUba5kBInrv6wQZwZaoOxbZLDVsi',
         *       group_ids: [],
         *       identifier: 'Categories',
         *       subcription_ids: 2,
         *       current_page_id: 2,
         *       outbound_message: null 
         *  }
         */
        socket.on('$onPageChange$Event', function(obj) {
            if (obj.current_page_id !== 1) {
                console.log("$onpageChangeEvent event triggers...", obj);
                if (!helper.isEmpty(obj.fingerPrint)) {
                    if (helper.isExists(obj.fingerPrint, connectedUsers)) {
                        if (helper.isExists(obj.user_id, connectedUsers[obj.fingerPrint])) {
                            connectedUsers[obj.fingerPrint][obj.user_id].socket_session = socket;
                            connectedUsers[obj.fingerPrint][obj.user_id].current_page_id = obj.current_page_id;
                            connectedUsers[obj.fingerPrint][obj.user_id].identifier = obj.identifier;
                        }
                    } else {
                        socket.user_id = obj.user_id;
                        var temp_obj1 = {};
                        temp_obj1[obj.user_id] = {
                            device_type: obj.deviceType,
                            fingerPrint: obj.fingerPrint,
                            socket_session: socket,
                            identifier: obj.identifier,
                            subscription_ids: [obj.user_id, obj.subcription_ids, obj.current_page_id],
                            current_page_id: obj.current_page_id,
                            outbound_message: obj.outbound_message,
                            last_seen: new Date().getTime()
                        };
                        connectedUsers[obj.fingerPrint] = temp_obj1;
                    }
                    subscriptions = saveAndUpdatePageIdInSubscriptions(subscriptions, obj);
                    subscriptions = saveAndUpdateGroupIdsToSubscriptions(subscriptions, obj);
                }
            }
        });

        /**
         * The following function is invoked each time when pages moves to backgroup or minimized
         * by user. this time this user make the user offline and remove the socket session from 
         * connectedUsers object which helds the socket session obj.
         * { 
         *       deviceType: 'Android Device',
         *       fingerPrint: 2958713207,
         *       user_id: 'shjkrUba5kBInrv6wQZwZaoOxbZLDVsi',
         *       group_ids: [],
         *       identifier: 'Categories',
         *       subcription_ids: 2,
         *       current_page_id: 2,
         *       outbound_message: null 
         *  }
         */
        socket.on('$onAppPause$event', function(obj) {
            console.log("$onAppPause$event event triggers...", obj, connectedUsers);
            try {
                if (connectedUsers[obj.fingerPrint]) {
                    delete connectedUsers[obj.fingerPrint][obj.user_id].socket_session;
                    console.log("User is going to offline successfully.");
                } else {
                    console.log("User " + obj.user_id + " is already dis-connected from socket either by restart socket-server or by manual logout.");
                }
            } catch (e) {
                console.log("Exception raised $onAppPause$event", e);
            }
        });

        /**
         * The following function is invoked each time when user type messages.
         * This event recieves the following data from the connected mobile app user. 
         * data.user_id = "user_id of connected user into mobile app."
         * data.current_page_id = "current_page_id of that page where user type message."
         * data.subcription_ds = at time we do not have any subscription right now so passed a null value.
         * data.outbound_message = this containes the message i.e who type the message for e.g. "Roger is typing ..."
         * with the above following data the following check the user who currently sibscribed that
         * page and show the messages i.e "Roger is typing..." to all connected users. 
         */
        socket.on('$typing$event', function(data) {
            console.log("$typing$event event triggers...");
            try {
                var page_id = data.current_page_id,
                    user_id = data.user_id, //current_logged_in user
                    fingerPrint = data.fingerPrint,
                    identifier = data.identifier,
                    message = data.outbound_message;

                for (var fingerPrints in connectedUsers) {
                    for (var connected in connectedUsers[fingerPrints]) {
                        if (connectedUsers[fingerPrints][connected].identifier.toString() == identifier.toString()) {
                            if (connectedUsers[fingerPrints][connected].fingerPrint !== fingerPrint) {
                                if (connectedUsers[fingerPrints][connected].socket_session) {
                                    connectedUsers[fingerPrints][connected].socket_session.emit('$typing$event', { msg: message });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.log("Exception raised in socket $typing event any of issue >>", e);
            }
        });

        socket.on('$stop$typing$event', function(data) {
            console.log("$stop$typing$event event triggers...");
            try {
                var page_id = data.current_page_id,
                    user_id = data.user_id,
                    fingerPrint = data.fingerPrint,
                    identifier = data.identifier,
                    message = data.outbound_message;

                for (var fingerPrints in connectedUsers) {
                    for (var connected in connectedUsers[fingerPrints]) {
                        if (connectedUsers[fingerPrints][connected].identifier.toString() == identifier.toString()) {
                            if (connectedUsers[fingerPrints][connected].fingerPrint !== fingerPrint) {
                                if (connectedUsers[fingerPrints][connected].socket_session) {
                                    connectedUsers[fingerPrints][connected].socket_session.emit('$stop$typing$event', { msg: message });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.log("Exception raised in socket $stop$typing$event event any of issue >>", e);
            }
        });

        socket.on('$push$message$event', function(data) {
            socket.broadcast.emit('$push$message$event', data);
        });

        socket.on('$Store$New$Page$data', function(obj) {
            console.log("$Store$New$Page$data event triggers...");
            var fingerPrint = obj.fingerPrint,
                userId = obj.userId;
            //going through each connctedUsers and check fingerPrint and userId
            for (var connctedUserFingerPrint in connectedUsers) {
                if (connctedUserFingerPrint == fingerPrint) {
                    for (var connected in connectedUsers[connctedUserFingerPrint]) {
                        if (connected == userId) {
                            connectedUsers[connctedUserFingerPrint][connected].new_pages = obj.newPages;
                        }
                    }
                }
            }
            //console.log("connnectedUser after adding newpages", connectedUsers);
        });

        socket.on("$check$Updated$Pages$On$App$Init", function(obj) {
            try {
                var fingerPrint = obj.fingerPrint,
                    user_id = obj.userId;

                if (helper.isEmpty(connectedUsers[fingerPrint][user_id])) {
                    console.log("Uable to despense updated_pages. Due to expired socket session with following details", obj);
                } else {
                    var updated_pages = connectedUsers[fingerPrint][user_id].updatedPages;
                    if (helper.isEmpty(updated_pages)) {
                        console.log("There isn't any new/updated pages for this user...", obj);
                    } else {
                        if (connectedUsers[fingerPrint][user_id].socket_session) {
                            connectedUsers[fingerPrint][user_id].socket_session.emit("$check$Updated$Pages$On$App$Init", updated_pages);
                        } else {
                            console.log("Socket session isn't established to send data...", obj);
                        }
                    }
                }
            } catch (e) {
                console.log("Exception raised while processing $check$Updated$Pages$On$App$Init event >>>", e);
            }
        });
    });

    /**
     * check if the concerned user Either connected or dis-connected.
     * if user is already connected then just push the watson data to user window no need to refresh page
     * if not connected then send page refresh event so when user comes to message page, need to refresh the page.
     * default application serve message page from local.
     **/
    process.on("$notify$Connected$Users", function(data) {
        console.log("$notify$Connected$Users event triggered successsfull >>>", data);
        try {
            var body = data.platform, //platfrom object send from node-red
                user_id = body.user_id, //user_id of user who send message to chatbot
                page_ids = body.page_ids, //associated page_id which needs to notifiy
                group_ids = body.group_ids; //group_ids interested in this change.

            updateConnectedUserWithPages({ page_ids: page_ids, connectedUsers: connectedUsers, user_id: user_id, group_ids: group_ids }, function(err, cbConnectedUsers) {
                for (var fingerPrints in cbConnectedUsers) {
                    for (var connected in cbConnectedUsers[fingerPrints]) {
                        if (helper.isExists(cbConnectedUsers[fingerPrints][connected].current_page_id, page_ids)) {
                            if (!helper.isEmpty(cbConnectedUsers[fingerPrints][connected].socket_session)) {
                                cbConnectedUsers[fingerPrints][connected].socket_session.emit("$notify$Connected$Users$From$Server", { isRefresh: false, phone: body.phone, msg: { bot_data: body.bot_data.data, user_data: body.bot_data.req_body.text }, page_id: cbConnectedUsers[fingerPrints][connected].current_page_id });
                            }
                        } else {
                            helper.getSubscribedUsers(group_ids, subscriptions, function(err, users) { //this code is used to send data to Assistants only
                                if (err) {
                                    console.log("Error while populating subscribedUser from subscription object", err);
                                } else {
                                    if (helper.isExists(connected, users)) {
                                        if (!helper.isEmpty(cbConnectedUsers[fingerPrints][connected].socket_session)) {
                                            cbConnectedUsers[fingerPrints][connected].socket_session.emit("$notify$Connected$Users$From$Server", { isRefresh: true, phone: body.phone, msg: { bot_data: body.bot_data.data, user_data: body.bot_data.req_body.text }, page_id: helper.getRefreshPage(18, page_ids) });
                                        }
                                    }
                                }     
                            });
                        }
                    }
                }
            });
        } catch (e) {
            console.log("Exception raised in socket $notify$Connected$Users event any of issue >>", e);
        }
    });

    /**
     * The following method is replica of the above method
     * this method is invoked or called when data is send by any of the operator
     * and them broadcase to all the connected user and react accordingly.
     **/
    process.on("$added$data$from$operator", function(data){
        console.log("$added$data$from$operator event triggered successsfull >>>", data);
        try {
            var body = data.platform, //platfrom object send from node-red
                user_id = body.user_id, //user_id of user who send message to chatbot
                page_ids = body.page_ids, //associated page_id which needs to notifiy
                group_ids = body.group_ids; //group_ids interested in this change.

            updateConnectedUserWithPages({ page_ids: page_ids, connectedUsers: connectedUsers, user_id: user_id, group_ids: group_ids }, function(err, cbConnectedUsers) {
                for (var fingerPrints in cbConnectedUsers) {
                    for (var connected in cbConnectedUsers[fingerPrints]) {
                        if (helper.isExists(cbConnectedUsers[fingerPrints][connected].current_page_id, page_ids)) {
                            if (!helper.isEmpty(cbConnectedUsers[fingerPrints][connected].socket_session)) {
                                cbConnectedUsers[fingerPrints][connected].socket_session.emit("$added$data$from$operator", { isRefresh: false, phone: body.phone, msg: body.msgBody, page_id: cbConnectedUsers[fingerPrints][connected].current_page_id });
                            }
                        } else {
                            helper.getSubscribedUsers(group_ids, subscriptions, function(err, users) { //this code is used to send data to Assistants only
                                if (err) {
                                    console.log("Error while populating subscribedUser from subscription object", err);
                                } else {
                                    if (helper.isExists(connected, users)) {
                                        if (!helper.isEmpty(cbConnectedUsers[fingerPrints][connected].socket_session)) {
                                            cbConnectedUsers[fingerPrints][connected].socket_session.emit("$added$data$from$operator", { isRefresh: true, phone: body.phone, msg: body.msgBody, page_id: helper.getRefreshPage(18, page_ids) });
                                        }
                                    }
                                }     
                            });
                        }
                    }
                }
            });
        } catch (e) {
            console.log("Exception raised in socket $notify$Connected$Users event any of issue >>", e);
        }
    });
};
