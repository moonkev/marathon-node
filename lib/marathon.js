var rp = require('request-promise');
var _ = require('lodash');

/**
 * https://mesosphere.github.io/marathon/docs/rest-api.html
 */

module.exports = Marathon;

function Marathon(url, opts) {
    opts = opts || {};

    var baseOptions = {
        url: url.replace(/\/$/, ''),
        json: true,
        timeout: opts.timeout
    };

    function makeRequest(method, path, addOptions, skipVersion) {
        return function closure(query, body) {
            var requestOptions = _.cloneDeep(baseOptions);
            path = (skipVersion ? '/' : '/v2/') + path;

            requestOptions.method = method;
            requestOptions.qs = query;
            requestOptions.url = requestOptions.url + path;

            if (addOptions) {
                requestOptions = _.extend(requestOptions, addOptions);
            }

            requestOptions.body = body;

            var consoleTimeToken = 'Request to Marathon ' + path;

            if (opts.logTime) {
                console.time(consoleTimeToken);
            }

            function logTime() {
                if (opts.logTime) {
                    console.timeEnd(consoleTimeToken);
                }
            }

            return rp(requestOptions)
                .catch(formatError)
                .finally(logTime);
        };

        function formatError(err) {
            var error = new Error('Marathon response was: ' + err.message);
            error.name = err.name;
            error.statusCode = err.statusCode;
            error.options = err.options;
            throw error;
        }
    }

    return {
        app: {
            getList: function getList(query) {
                return makeRequest('GET', 'apps')(query);
            },
            getOne: function getOne(id, query) {
                return makeRequest('GET', 'apps/' + id)(query);
            },
            getVersions: function getVersions(id) {
                return makeRequest('GET', 'apps/' + id + '/versions')();
            },
            getVersion: function getVersion(id, version) {
                return makeRequest('GET', 'apps/' + id + '/versions/' + version)();
            },
            getTasks: function getTasks(id) {
                return makeRequest('GET', 'apps/' + id + '/tasks')();
            },
            create: function create(body) {
                return makeRequest('POST', 'apps')(null, body);
            },
            update: function update(id, body, force) {
                return makeRequest('PUT', 'apps/' + id)({force: force}, body);
            },
            restart: function restart(id, force) {
                return makeRequest('POST', 'apps/' + id + '/restart')({force: force});
            },
            destroy: function destroy(id) {
                return makeRequest('DELETE', 'apps/' + id)();
            },
            killTasks: function killTasks(id, parameters) {
                return makeRequest('DELETE', 'apps/' + id + '/tasks')(parameters);
            },
            killTask: function killTask(id, task, scale) {
                return makeRequest('DELETE', 'apps/' + id + '/tasks/' + task)({scale: scale});
            }
        },
        groups: {},
        tasks: {},
        deployments: {},
        subscriptions: {
            getList: makeRequest('GET', 'eventSubscriptions'),
            create: function create(url) {
                return makeRequest('POST', 'eventSubscriptions')({callbackUrl: url});
            },
            delete: function deleteSubscription(url) {
                return makeRequest('DELETE', 'eventSubscriptions')({callbackUrl: url});
            }
        },
        queue: {},
        info: {},
        misc: {
            ping: function ping(addOptions) {
                return makeRequest('GET', 'ping', addOptions, true)();
            }
        }
    };
}
