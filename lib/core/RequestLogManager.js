'use strict';

import utils from '../utils.js';
import InterceptorManager from './InterceptorManager.js';
import buildFullPath from './buildFullPath.js';

class RequestLogManager {
    constructor(interceptorManager) {
        this.log = [];
        this.interceptorID = null;
        this.interceptorManager = interceptorManager;
    }

    addResponseLogInterceptor() {
        if (this.interceptorID) {
            return ;
        } else {
            const newInterceptorID = this.interceptorManager.use(res => {
                // Since response contains a request field, using the interceptor on responses is sufficient for populating log entry
                if (utils.isResponse(res)) {
                    const method = (res.request.method).toUpperCase();
                    const url = buildFullPath.buildFullPath(res.request.baseURL, res.request.url, res.request.allowAbsoluteUrls);
                    this.log.push({
                        method : method,
                        url : url,
                        status : res.status
                    });
                    return res;
                }
            }, 
            err => {
                if (err.response) {
                    const method = (err.request.method).toUpperCase();
                    const url = buildFullPath.buildFullPath(err.request.baseURL, err.request.url, err.request.allowAbsoluteUrls);
                    this.log.push({
                        method: method,
                        url: url,
                        status: err.response.status,
                        error: err.message
                    });
                } else if (err.request) {
                    const method = (err.request.method).toUpperCase();
                    const url = buildFullPath.buildFullPath(err.request.baseURL, err.request.url, err.request.allowAbsoluteUrls);
                    this.log.push({
                        method: method,
                        url: url,
                        status: 0,
                        errorType: 'No_response',
                        error: err.message
                    });
                } else {
                    this.log.push({
                        method: 'unknown',
                        url: 'unknown',
                        status: 0,
                        errorType: 'Error_when_setting_up_request',
                        error: err.message
                    });
                }
                return Promise.reject(err);
            });
            // Add the interceptor's ID so that it can be ejected when not needed.
            this.interceptorID = newInterceptorID;
        }
    }

    ejectLogInterceptor() {
        if (this.interceptorID) {
            this.interceptorManager.eject(this.interceptorID);
            this.interceptorID = null;
        }
    }

    getLog() {
        return this.log;
    }

    clearLog() {
        this.log = [];
    }
}    

export default RequestLogManager;