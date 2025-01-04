///////////////////////////////////////////////////////////////////////////////////
// Thomson.Ssi.Subscription Service
///////////////////////////////////////////////////////////////////////////////////

var Thomson = {};

Thomson.Ssi = {

    SubscriptionRequest: function () {
        this._subscriptionRequest = new Object();
        this._subscriptionRequest.type = 'subscribe';
        this._subscriptionRequest._marketDataSubscription = new Thomson.Ssi.MarketDataSubscription();
    },

    SubscriptionResponse: function (response) {
        this._type = response.type;
        this._updateRows = [];
        var updateRows = response.updateRows;
        for (i = 0; i < updateRows.length; i++) {
            this._updateRows[i] = new Thomson.Ssi.UpdateRow(updateRows[i]);
        }
    },

    UpdateRow: function (updateRow) {
        this._updateRow = updateRow;    
    },

    FidValue : function(data) {        
        this._fidValue = new Object();
        this._fidValue.fid = data.f;
        this._fidValue.value = data.v;
    },

    MarketDataSubscription : function() {
        this._marketDataSubscription = new Object();
        this._marketDataSubscription.source = [];
    },

    Subscription: function () {
        this._callbacks = {};
        this._options = null;
        this._currentCallbackId = 0;   
    },

    ElementsManager: function () {
        this._options = null;
        this._upColor = "green";
        this._downColor = "red";
    },
     NewsHeadlinesResponse: function (response) {
        this._type = response.type;
        this.set_newsSource(response.source);
        this.set_text(response.text);
        this.set_timeStamp(response.timeStamp);
	    this.set_newsFlags(response.newsFlags);
        this.set_newsSourceKey(response.newsSourceKey);
        this.set_storyNumber(response.storyNumber);
		this.set_url(response.url);
        this.set_newsServiceCode(response.newsServiceCode);
        this.set_codes(response.codes);	
		this.set_raw(response.raw);	
    },
 
    NewsHeadlinesManager: function () {
    },
    AlertNotificationManager: function () {
    },
   AlertNotificationResponse: function (response) {
       this._type = response.type;     
       this.set_msgId1(response.msgId1);
       this.set_msgId2(response.msgId2);
       this.set_msgId3(response.msgId3);
       this.set_msgId4(response.msgId4);
        this.set_text(response.text);
        this.set_timeStamp(response.timeStamp);
        this.set_expireTime(response.expireTime);
        this.set_raw(response.raw);
    },
    _init : function()
    {
        if (!Thomson.Ssi._subscriptionObj) {
            Thomson.Ssi._subscriptionObj = new Thomson.Ssi.Subscription();
        }
        if (!Thomson.Ssi._elementsManager) {
            Thomson.Ssi._elementsManager = new Thomson.Ssi.ElementsManager();
        }
        this._ensureServerStarted();
        if (Thomson.Ssi._subscriptionObj._webSocket == null) {
            // Try starting WebSocket
            this._initWebSocketService();
        }
        // If WebSocket is not started, switch to WCF Service
        if (Thomson.Ssi._subscriptionObj._webSocket == null) {
            this._initWCFService();
        }
    },

    _initWCFService: function ()
    {
        if(!Thomson.Ssi._ssiServiceFactory) {
            try {
                Thomson.Ssi._ssiServiceFactory = window.external.SSIServiceFactory;  
                Thomson.Ssi.BrowserType = "IE";
            }
            catch (e) { }

            if(!Thomson.Ssi._ssiServiceFactory)
            {
                // incase of chrome
                Thomson.Ssi._ssiServiceFactory = window.SSIServiceFactory;
                Thomson.Ssi.BrowserType = "Chrome";
                InitChromeOverrides();
            }
			 if(!Thomson.Ssi._ssiServiceFactory)
            {
                // incase of Edge
                Thomson.Ssi._ssiServiceFactory = chrome.webview.hostObjects.sync.webviewHostObject.SSIServiceFactory;
                Thomson.Ssi.BrowserType = "Edge";              
            }
			
        }
        
        if (Thomson.Ssi._ssiServiceFactory) {
            var ssiSnapshotService = Thomson.Ssi._ssiServiceFactory.GetService("Thomson.Financial.Framework.Managed.SSI.ISSIStreamingDataService");

            this._snapshotService = ssiSnapshotService;
            this._messageHandler = null;
            var messageScriptKey = ssiSnapshotService.SnapshotMessageCallbackScriptKey;
			if( Thomson.Ssi.BrowserType == "Edge"){
			    ssiSnapshotService.RegisterCallbackScript(messageScriptKey, "onMessage");
				chrome.webview.addEventListener('message',onMessage);				
            }
			else
			{
            ssiSnapshotService.RegisterCallbackScript(messageScriptKey, "Tfsi_Snapshot_MessageHandler");
            if (Thomson.Ssi.BrowserType == "Chrome") {
                window.SetCallBack("Tfsi_Snapshot_MessageHandler", Tfsi_Snapshot_MessageHandler);
            }
			}
        }
    },

    _ensureServerStarted: function ()
    {
        if (!Thomson.Ssi._ssiServiceFactory) {
            try {
                Thomson.Ssi._ssiServiceFactory = window.external.SSIServiceFactory;
                Thomson.Ssi.BrowserType = "IE";
            }
            catch (e) { }

            if (!Thomson.Ssi._ssiServiceFactory) {
                // incase of chrome
                Thomson.Ssi._ssiServiceFactory = window.SSIServiceFactory;
                Thomson.Ssi.BrowserType = "Chrome";
                InitChromeOverrides();
            }
			 if(!Thomson.Ssi._ssiServiceFactory)
            {
                // incase of Edge
                Thomson.Ssi._ssiServiceFactory = chrome.webview.hostObjects.sync.webviewHostObject.SSIServiceFactory;
                Thomson.Ssi.BrowserType = "Edge";   
            }
        }
        if (Thomson.Ssi._ssiServiceFactory) {
            var ssiManagmentService = Thomson.Ssi._ssiServiceFactory.GetService("Thomson.Financial.Framework.Managed.SSI.ISSIManagmentService");
            ssiManagmentService.StartRealTimeHttpSrvrManager();
        }
    },

    _IsValidEndPoint: function (endpoint)
    {
        if(endpoint == null)
            return false;
        var pos1 = endpoint.indexOf("://");
        var pos2 = endpoint.lastIndexOf(":");
        if (pos2 == -1 || pos1 == pos2)
            return false;
        pos1 += 3; // Server name starts after ://
        var server = endpoint.slice(pos1, pos2 - pos1);
        if (server == null || server.length == 0)
            return false;
        return true;
    },

    _initWebSocketService: function ()
    {
        if (window.WebSocket) {
            try {
                var endpoint = Thomson.Ssi._subscriptionObj._getEndpoint();
                if (!this._IsValidEndPoint(endpoint))
                    return;
                var ws = new WebSocket(endpoint);
                Thomson.Ssi._subscriptionObj._webSocket = ws;
                ws.onopen = function () {
                    //alert("Socket opened: " + endpoint);
                    if(Thomson.Ssi._subscriptionObj._pendingRequests != null)
                    {
                        var requests = Thomson.Ssi._subscriptionObj._pendingRequests;
                        for (i = 0; i < requests.length; i++)
                        {
                            ws.send(requests[i]);
                        }
                        Thomson.Ssi._subscriptionObj._pendingRequests = null;
                    }
                };
                ws.onclose = function (e) {
                    Thomson.Ssi._subscriptionObj._pendingRequests = null;
                    Thomson.Ssi._subscriptionObj._webSocket = null;
                    //if (e.code != 1000 && e.code != 1001) {
                        //alert("WebSocket is closed. Reason=" + e.reason + " Code=" + e.code);
                        // 1000: CLOSE_NORMAL
                        // 1001: CLOSE_GOING_AWAY
                        // 1015 (TLS_HANDSHAKE_FAILURE):
                        // Reserved. Indicates that the connection was closed due to a 
                        // failure to perform a TLS handshake (e.g., the server certificate can't be verified).
                    //}
                }
                ws.onmessage = function (message) {
                    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
                    if (ssService) {
                        ssService._listener(JSON.parse(message.data));
                    }
                };
            }
            catch (e) {
                Thomson.Ssi._subscriptionObj._webSocket = null;
                //if (Sys)
                //    Sys.Debug.trace(Tfsi.InstanceName + " [Failed to start WebSocket]" + e);
            }
        }
    },

///////////////////////////////////////////////////////////////////////////////////
// Thomson.Ssi.ServiceFactory Class
///////////////////////////////////////////////////////////////////////////////////

     ServiceFactory : {
         
        getService : function(serviceName) {
            if (serviceName == "ISubscribe") {
                if (!Thomson.Ssi._subscriptionObj) {
                    Thomson.Ssi._subscriptionObj = new Thomson.Ssi.Subscription();
                }
                return Thomson.Ssi._subscriptionObj;
            }
            else if (serviceName == "IElementsManager") {
                if (!Thomson.Ssi._elementsManager) {
                    Thomson.Ssi._elementsManager = new Thomson.Ssi.ElementsManager();
                }
                return Thomson.Ssi._elementsManager;
            }
			 else if (serviceName == "INewsHeadlinesManager") {
                if (!Thomson.Ssi._newsHeadlinesManager) {
                    Thomson.Ssi._newsHeadlinesManager = new Thomson.Ssi.NewsHeadlinesManager();
                }
                return Thomson.Ssi._newsHeadlinesManager;
            }
			 else if (serviceName == "IAlerts") {
			     if (!Thomson.Ssi._alertNotificationManager) {
			         Thomson.Ssi._alertNotificationManager = new Thomson.Ssi.AlertNotificationManager();
			     }
			     return Thomson.Ssi._alertNotificationManager;
			 }
            else {
                return null;
            }
        },
    }
};


Thomson.Ssi.SubscriptionRequest.prototype = {
    get_Type: function () {
        return this._subscriptionRequest.type;
    },

    set_Type: function (type) {
        this._subscriptionRequest.type = type;
    },

    get_CallbackId: function () {
        return this._subscriptionRequest.callback_id;
    },

    set_CallbackId: function(value) {
        this._subscriptionRequest.callback_id = value;
    },
    
    get_Data: function() {
        return this._subscriptionRequest._marketDataSubscription.Data();
    },
        
    // Set the FIDs to be retrieved
    set_Fields: function(value) {   
        // value: Array of String             
        var marketDataSubscription = this._subscriptionRequest._marketDataSubscription;
        marketDataSubscription.set_Fields(value);
    },
    
    // Set the symbols for the request
    set_Topics: function(value) {
        // value: Array of String
        var marketDataSubscription = this._subscriptionRequest._marketDataSubscription;
        marketDataSubscription.set_Topics(value);
    },
    
    set_TopicIds: function (value) {
        // value: Array of String
        var marketDataSubscription = this._subscriptionRequest._marketDataSubscription;
        marketDataSubscription.set_TopicIds(value);
    },

    set_Options: function (value) {
        var marketDataSubscription = this._subscriptionRequest._marketDataSubscription;
        marketDataSubscription.set_Options(value);
    }
}

Thomson.Ssi.SubscriptionResponse.prototype = {

    // Returns an array of Thomson.Ssi.UpdateRow objects
    get_UpdateRows: function () {
        return this._updateRows;
    },

    get_Type: function () {
        return this._type;
    }
}

Thomson.Ssi.UpdateRow.prototype = {

    get_Id: function() {
        return this._updateRow.id;
    },

    set_Id: function (id) {
        this._updateRow.id = id;
    },

    // Returns an array of Thomson.Ssi.FidValue objects
    get_PriceData: function() {
        if (this._priceData) {
            return this._priceData;
        }
        var fidData = this._updateRow.fidData;        
        this._priceData = {};
        this._fields = [];
        for (i = 0; i < fidData.length; i++) {
            var data = fidData[i];
            this._priceData[data.f] = data.v;
            this._fields.push(data.f);
        }
        
        return this._priceData;
    },
    // Return fields from updaterow
    get_Fields: function () {
        if (this._fields) {
            return this._fields;
        }
        var fidData = this._updateRow.fidData;
        this._priceData = {};
        this._fields = [];
        for (i = 0; i < fidData.length; i++) {
            var data = fidData[i];
            this._priceData[data.f] = data.v;
            this._fields.push(data.f);
        }
        return this._fields;
    },

    get_ErrorCode: function () {
        return this._updateRow.errorCode;
    },    
    
    get_Error: function() {
        return this._updateRow.error;
    }    
}
Thomson.Ssi.FidValue.prototype = {

    get_Fid: function() {
        return this._fidValue.fid;
    },

    get_Value: function() {
        return this._fidValue.value;
    }
}
Thomson.Ssi.NewsHeadlinesResponse.prototype = {
    set_newsSource: function (value) {
        this._newSource = value;
    },
    set_text: function (value) {
        this._text = value;
    },
    set_timeStamp: function (value) {
        this._timeStamp = value;
    },
    get_newsSource: function () {
        return this._newSource;
    },
    get_text: function () {
        return this._text;
    },
    get_timeStamp: function () {
        return this._timeStamp;
    }
}
Thomson.Ssi.MarketDataSubscription.prototype = {

    Data : function() {
        return this._marketDataSubscription;
    },
    
    get_Fields: function() {
        return this._marketDataSubscription.fields;
    },
    
    set_Fields: function(value) {        
        this._marketDataSubscription.fields = value;
    },

    get_Topics: function() {
        return this._marketDataSubscription.topics;
    },

    set_Topics: function(value) {        
        this._marketDataSubscription.topics = value;
    },

    get_TopicIds: function()
    {
        return this._marketDataSubscription.topicIds;
    },

    set_TopicIds: function (value)
    {
        this._marketDataSubscription.topicIds = value;
    },
    
    get_Options: function() {
        return this._marketDataSubscription.options;
    },

    set_Options: function(value) {        
        this._marketDataSubscription.options = value;
    }, 
}

Thomson.Ssi.Subscription.prototype =
{
    registerCallback: Thomson$Ssi$Subscription$registerCallback,
    registerInstance: Thomson$Ssi$Subscription$registerInstance,
    unregisterInstance: Thomson$Ssi$Subscription$unregisterInstance,
    close: Thomson$Ssi$Subscription$close,
    subscribe: Thomson$Ssi$Subscription$subscribe,
    setOptions: Thomson$Ssi$Subscription$setOptions,
    unsubscribe: Thomson$Ssi$Subscription$unsubscribe,
    getSnapshot: Thomson$Ssi$Subscription$getSnapshot,
    _sendRequest: Thomson$Ssi$Subscription$_sendRequest,
    _getEndpoint: Thomson$Ssi$Subscription$_getEndpoint,
    _listener: Thomson$Ssi$Subscription$_listener,
    _getCallbackId: Thomson$Ssi$Subscription$_getCallbackId
}

function Thomson$Ssi$Subscription$registerCallback(value) {
    this.callbackFn = value;
}

function Thomson$Ssi$Subscription$registerInstance(name) {
    var request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("register");
    request.set_Fields([]);
    request.set_Topics([name]);
    request.set_TopicIds([]);
    request.set_CallbackId(this._getCallbackId());
    var promise = this._sendRequest(request);
}

function Thomson$Ssi$Subscription$unregisterInstance(name) {
    var request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("unregister");
    request.set_Fields([]);
    request.set_Topics([name]);
    request.set_TopicIds([]);
    request.set_CallbackId(this._getCallbackId());
    var promise = this._sendRequest(request);
}
function Thomson$Ssi$Subscription$close() {
    if (this._webSocket != null) {
        this._webSocket.close();
        this._webSocket = null;
    }
    else {
        // TODO: Disconnect WCF
    }
}

function Thomson$Ssi$Subscription$subscribe(symbols, fields) {
    var ids, i = 0, symbol, id, symIds;
    var request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("subscribe");
    if (this._options) {
        request.set_Options(this._options);
    }
    request.set_Fields(fields);
    syms = symbols;
    if (typeof (symbols) == "string") {
        var syms = symbols.split(';');
        symbols = syms;
    }
    ids = [];
    if (symbols.length > 0) {
        for (i = 0; i < symbols.length; i++) {
            id = this._getCallbackId();
            ids.push(id);
        }
    }
    request.set_Topics(symbols);
    request.set_TopicIds(ids);
    request.set_CallbackId(this._getCallbackId());
    var promise = this._sendRequest(request);
    if (this.callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(this.callbackFn);
    }
    return ids;
}

function Thomson$Ssi$Subscription$setOptions(options) {
    if (this._options == null) {
        this._options = options.split(';');
    }
    else if (this._options.length == 0) {
        this._options = options.split(';');
        return;
    }
    else {
        var i, j, found, p1, p2, opt;
        opt = options.split(';')
        for (i = 0; i < opt.length; i++) {
            p1 = opt[i].split(':');
            if (p1.length == 2) {
                found = false;
                for (j = 0; j < this._options.length; j++) {
                    p2 = this._options[j].split(':');
                    if (p1[0] == p2[0]) {
                        this._options[j] = opt[i];
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this._options.push(opt[i]);
                }
            }
        }
    }
}

function Thomson$Ssi$Subscription$unsubscribe(ids) {
    if (ids == null || ids.length == 0)
        return;
    var request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("unsubscribe");
    request.set_Fields([]);
    request.set_Topics([]);
    if (typeof (ids) == "number") {
        var id = ids + ";";
        ids = id.split(";");
    }
    else if (typeof (ids) == "string") {
        var idVals = ids.split(';');
        ids = idVals;
    }
    request.set_TopicIds(ids);
    request.set_CallbackId(0);
    var promise = this._sendRequest(request);
    //if (handler) {
    //    // The handler will be invoked when the response comes back
    //    promise.done(handler);
    //}
}

// ElementsManager
Thomson.Ssi.ElementsManager.prototype =
{
    registerInstance: Thomson$Ssi$ElementsManager$registerInstance,
    unregisterInstance: Thomson$Ssi$ElementsManager$unregisterInstance,
    setDefaultUpColor: Thomson$Ssi$ElementsManager$setDefaultUpColor,
    setDefaultDownColor: Thomson$Ssi$ElementsManager$setDefaultDownColor,
    close: Thomson$Ssi$ElementsManager$close,
    setOptions: Thomson$Ssi$ElementsManager$setOptions,
    scanForStreamingElements: Thomson$Ssi$ElementsManager$scanForStreamingElements,
    subscribe: Thomson$Ssi$ElementsManager$subscribe,
    unsubscribe: Thomson$Ssi$ElementsManager$unsubscribe,
    getSnapshot: Thomson$Ssi$ElementsManager$getSnapshot,
    _callbackFn: Thomson$Ssi$ElementsManager$_callbackFn,
}

function Thomson$Ssi$ElementsManager$registerInstance(name) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.registerInstance(name);
}

function Thomson$Ssi$ElementsManager$unregisterInstance(name) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.unregisterInstance(name);
}

function Thomson$Ssi$ElementsManager$setDefaultUpColor(color) {
    this._upColor = color;
}

function Thomson$Ssi$ElementsManager$setDefaultDownColor(color) {
    this._downColor = color;
}

function Thomson$Ssi$ElementsManager$close() {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.close();
}

function Thomson$Ssi$ElementsManager$unsubscribe() {
    if (this._subscriptionIds != null && this._subscriptionIds.length > 0) {
        ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
        ssService.unsubscribe(this._subscriptionIds);
    }
}

function Thomson$Ssi$ElementsManager$scanForStreamingElements(parent) {
    // TODO: scan and identify symbols and fields
    var se, i, e, s, f, key,count;
    this._fields = [];
    this._symbols = [];
    this._elements = [];
    if (parent) {
        se = parent.querySelectorAll("[ILX_FIELD]");
    }
    else {
        se = $("[ILX_FIELD]");
    }
    count = 0;
    for (i = 0; i < se.length; i++) {
        e = se[i];
        s = e.getAttribute("ILX_SYMBOL");
        f = e.getAttribute("ILX_FIELD");
        if (f == "StatusInfo") {
            s = "";
        }
        else {
            if (s == null || f == null)
                continue;
            if (s.length == 0 || f.length == 0)
                continue;
            if (this._symbols.indexOf(s) === -1) {
                this._symbols.push(s);
            }
            if (this._fields.indexOf(f) === -1) {
                this._fields.push(f);
            }
        }
        key = i + "_" + s + "_" + f;
        this._elements[key] = e;
        count++;
    }
    this._scanElementRowCount = count;
}

function Thomson$Ssi$ElementsManager$setOptions(option) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.setOptions(option);
}

function Thomson$Ssi$ElementsManager$subscribe() {
    var ssService, sid, sids, i, j, s, f, key, e, elements, statusInfo;
    if (this._fields == null || this._symbols == null)
        return;
    if (this._fields.length == 0 || this._symbols.length == 0)
        return;
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.registerCallback(this._callbackFn);
    sids = ssService.subscribe(this._symbols, this._fields);
    elements = [];
    if (this._scanElementRowCount > 0)
    { 
        if(this._scanElementRowCount>sids.length)
        {
            for (i = 0; i < this._scanElementRowCount; i++) {
                for (k = 0; k < sids.length; k++) {
                    s = this._symbols[k];
                    sid = sids[k];
                    elements = StoreTDElement(i, true, s, sid, this._fields, this._elements, elements);
                }
            }
        }
        else
        {
            for (i = 0; i < sids.length; i++) {
                s = this._symbols[i];
                sid = sids[i];
                elements = StoreTDElement(i, true, s, sid, this._fields, this._elements, elements);
            }
        }
    }
    else
    {
        for (i = 0; i < sids.length; i++) {
            s = this._symbols[i];
            sid = sids[i];
            elements = StoreTDElement(i, false, s, sid, this._fields, this._elements, elements);
        }
    }
    statusInfo = this._elements["_StatusInfo"];
    if (statusInfo != null) {
        elements["_StatusInfo"] = statusInfo;
    }
    // Post subscription
    // Store elements and subscription ids
    this._elements = elements;
    this._subscriptionIds = sids;
    // Clear symbols and fields - expect scanForStreamingElements before getSnapshot or subscribe
    this._symbols = [];
    this._fields = [];
}

function StoreTDElement(counter,isScan,s,sid,fields,elms,elements)
{ 
    if(counter>=0)
    {       
        for (j = 0; j < fields.length; j++) {
            f = fields[j];
            if(isScan)
            {
                key = counter + "_" + s + "_" + f;
                e = elms[key];
                key = counter + "_" + sid + "_" + f;
                elements[key] = e;
            }
            else{
                key =  s + "_" + f;
                e = elms[key];
                key =  sid + "_" + f;
                elements[key] = e;
            }
        }
    }
    return elements;
}

function Thomson$Ssi$ElementsManager$getSnapshot() {
    var ssService, sid, sids, i, j, s, f, key, e, elements;
    if (this._fields == null || this._symbols == null)
        return;
    if (this._fields.length == 0 || this._symbols.length == 0)
        return;
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.registerCallback(this._callbackFn);
    sids = ssService.getSnapshot(this._symbols, this._fields);
    elements = [];
    for (i = 0; i < sids.length; i++) {
        s = this._symbols[i];
        sid = sids[i];
        for (j = 0; j < this._fields.length; j++) {
            f = this._fields[j];
            key = s + "_" + f;
            e = this._elements[key];
            key = sid + "_" + f;
            elements[key] = e;
        }
    }
    statusInfo = this._elements["_StatusInfo"];
    if (statusInfo != null) {
        elements["_StatusInfo"] = statusInfo;
    }
    // Post snapshot
    // Store elements
    this._elements = elements;
    // Clear symbols and fields - expect scanForStreamingElements before getSnapshot or subscribe
    this._symbols = [];
    this._fields = [];
    // getSnapshot doesn't need unsubscription
    this._subscriptionIds = [];
}

function Thomson$Ssi$ElementsManager$_callbackFn(response) {
    var i, j, updateRow, id, fid, key, cell, priceData, fields, fidValue, elements, scanElementRowCount;
    ssService = Thomson.Ssi.ServiceFactory.getService("IElementsManager");
    elements = ssService._elements;
    scanElementRowCount = ssService._scanElementRowCount;
    if (response.get_Type() == "onStatus")
    {
        updateRows = response.get_UpdateRows();
        if (updateRows.length == 1) {
            updateRow = updateRows[0];
            priceData = updateRow.get_PriceData();
            status = priceData["StatusInfo"];
            cell = elements["_StatusInfo"];
            if (cell != null)
                cell.innerText = status;
        }
        return;
    }
    // updateRows is an array of Thomson.Ssi.UpdateRow objects
    var updateRows = response.get_UpdateRows();
    for (k = 0; k < updateRows.length; k++) {
        updateRow = updateRows[k];       ;
        if (scanElementRowCount) {
            if (scanElementRowCount > updateRows.length) {
                for (i = 0; i < scanElementRowCount; i++) {
                    UpdateDataInHtml(updateRow, elements, ssService, true, i);
                }
            }
            else {
                UpdateDataInHtml(updateRow, elements, ssService, true, k);
            }
        }
        else {
            UpdateDataInHtml(updateRow, elements, ssService, false, k);
        }
    }
}

function UpdateDataInHtml(updateRow, elements, ssService,isScan,i)
{
    sid = updateRow.get_Id();
    priceData = updateRow.get_PriceData();
    fields = updateRow.get_Fields();
    for (j = 0; j < fields.length; ++j) {
        fid = fields[j];
        if (isScan) {
            key = i + "_" + sid + "_" + fid;
        }
        else {
            key = sid + "_" + fid;
        }
        cell = elements[key];
        if (cell != undefined) {
            if (fid in priceData) {
                var fidValue = priceData[fid];
                cell.innerText = fidValue;
                if (fid == "FID_TICK" || fid == "tick") {
                    if (fidValue == "1") {
                        cell.innerHTML = "&uarr;";
                        cell.style.color = ssService._upColor;
                    }
                    else if (fidValue == "0") {
                        cell.innerHTML = "&darr;";
                        cell.style.color = ssService._downColor;
                    }
                    else if (fidValue == "D" || fidValue == "Y") { // D or Y
                        cell.innerText = fidValue;
                        cell.style.backgroundColor = "black";
                        cell.style.color = "white";
                    }
                    else {
                        cell.innerHTML = fidValue;
                    }
                }
                else {
                    cell.innerHTML = fidValue;
                    if (fid == 'FID_NET_CHG' || fid == 'FID_PCNT_CHG' || fid == 'netChg' || fid == 'pcntChg') {
                        if (fidValue > 0) {
                            cell.style.color = ssService._upColor;
                        }
                        else if (fidValue < 0) {
                            cell.style.color = ssService._downColor;
                        }
                    }
                }
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////
// News Headlines
Thomson.Ssi.NewsHeadlinesResponse.prototype = {
    set_newsSource: function (value) {
        this._newSource = value;
    },
    set_text: function (value) {
        this._text = value;
    },
    set_timeStamp: function (value) {
        this._timeStamp = value;
    },
	set_newsFlags: function (value) {
        this._newsFlags = value;
    },
	set_newsSourceKey: function (value) {
        this._newsSourceKey  = value;
    },
	set_storyNumber: function (value) {
        this._storyNumber  = value;
    },
	set_url: function (value) {
       this._url  = value;
    },
	set_newsServiceCode: function (value) {
        this._newsServiceCode= value;
    },
	set_codes: function (value) {
         this._codes  = value;;
    },
	set_raw: function (value) {
         this._raw  = value;;
    },
    get_raw: function () {
        return this._raw;
    },
    get_newsSource: function () {
        return this._newSource;
    },
    get_text: function () {
        return this._text;
    },
    get_timeStamp: function () {
        return this._timeStamp;
    },
	get_newsFlags: function () {
        return this._newsFlags;
    },
	get_newsSourceKey: function () {
        return this._newsSourceKey;
    },
	get_storyNumber: function () {
        return this._storyNumber;
    },
	get_url: function () {
        return this._url;
    },
	get_newsServiceCode: function () {
        return this._newsServiceCode;
    },
	get_codes: function () {
        return this._codes;
    }
}

Thomson.Ssi.NewsHeadlinesManager.prototype =
{
	registerCallback: Thomson$Ssi$NewsHeadlinesManager$registerCallback,
	registerInstance: Thomson$Ssi$NewsHeadlinesManager$registerInstance,
    unregisterInstance: Thomson$Ssi$NewsHeadlinesManager$unregisterInstance,   
    close: Thomson$Ssi$NewsHeadlinesManager$close,
	unsubscribe: Thomson$Ssi$NewsHeadlinesManager$unsubscribe,
	subscribe:Thomson$Ssi$NewsHeadlinesManager$subscribe,
	subscribeWithSubProductId: Thomson$Ssi$NewsHeadlinesManager$subscribeWithSubProductId,
	_unsubscribeAll: Thomson$Ssi$NewsHeadlinesManager$unsubscribeAll,
    _subscribeNewsSource: Thomson$Ssi$NewsHeadlinesManager$subscribeNewsSource,
    _unsubscribeNewsSource: Thomson$Ssi$NewsHeadlinesManager$unsubscribeNewsSource,   
    _unsubscribeWithSubProductId: Thomson$Ssi$NewsHeadlinesManager$unsubscribeWithSubProductId,
    _setHeadlineFilter: Thomson$Ssi$NewsHeadlinesManager$setHeadlineFilter,
    _setAdvancedHeadlineFilter: Thomson$Ssi$NewsHeadlinesManager$setAdvancedHeadlineFilter,
	_subscribenews:Thomson$Ssi$NewsHeadlinesManager$_subscribenews,
   
}
function Thomson$Ssi$NewsHeadlinesManager$_subscribenews(response)
{
	//var callback=Thomson.Ssi._newsHeadlinesManager.subscribeCallBackFn;
	////if(!Thomson.Ssi._newsHeadlinesManager.isFilterSet)
	//{
	 //var filters=Thomson.Ssi._newsHeadlinesManager.filters;	 
	 //Thomson.Ssi._newsHeadlinesManager._setAdvancedHeadlineFilter(filters,this._subscribenews);
	 //Thomson.Ssi._newsHeadlinesManager.isFilterSet=true;
	//}
	 //callback(response);
	 
}


function Thomson$Ssi$NewsHeadlinesManager$registerCallback(value) {
    this.callbackFn = value;
}
   function Thomson$Ssi$NewsHeadlinesManager$registerInstance(name) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.registerInstance(name);
}

function Thomson$Ssi$NewsHeadlinesManager$unregisterInstance(name) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.unregisterInstance(name);
}
   function Thomson$Ssi$NewsHeadlinesManager$close() {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.close();
}    

function Thomson$Ssi$NewsHeadlinesManager$subscribe(sourceArray,filter, callbackFn){
	this._subscribeNewsSource(sourceArray, filter, callbackFn);
}

function Thomson$Ssi$NewsHeadlinesManager$unsubscribe(tableID){
	if(tableID)
	{
		this._unsubscribeNewsSource(this.sources,this._subscribenews);
	}
	else
	{
		this._unsubscribeWithSubProductId(this.prsources,this.prodIds,this._subscribenews);
	}
	this._unsubscribeAll();
}

function Thomson$Ssi$NewsHeadlinesManager$subscribeNewsSource(sourceArray, filter, callbackFn) {
    var id, ids, request;
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("SubscribeNewsSource");
   this.sources = sourceArray;
    if (typeof(this.sources) == "string") {
        var src = this.sources.split(';');
       this.sources = src;
    }
    request.set_Topics(this.sources);
    request.set_Fields([]);
    ids = [];
    request.set_TopicIds(ids);
	var filters=[filter]
	ids=this._setAdvancedHeadlineFilter(filters,this._subscribenews);
	ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    var promise = ssService._sendRequest(request);
    if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
    }
    return ids;
}

function Thomson$Ssi$NewsHeadlinesManager$unsubscribeNewsSource(sourceArray, callbackFn) {
    var id, ids, sources, prodIds, request;
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("UnsubscribeNewsSource");
    sources = sourceArray;
    if (typeof (sources) == "string") {
        var src = source.split(';');
        sources = src;
    }
    request.set_Topics(sources);
    request.set_Fields([]);
    ids = [];
    request.set_TopicIds(ids);
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	request.set_CallbackId(ssService._getCallbackId());
    var promise = ssService._sendRequest(request);
    if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
    }  
}


function Thomson$Ssi$NewsHeadlinesManager$subscribeWithSubProductId(sourceArray, productIdsArray,filter, callbackFn) {
    var id, ids, request;
	
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("SubscribeToNewsSourceWithSubProductId");
    this.prsources = sourceArray;
    if (typeof (this.prsources) == "string") {
        var src = this.prsources.split(';');
      this.prsources = src;
    }
    this.prodIds = productIdsArray;
    if (typeof (this.prodIds) == "string") {
        var prids = this.prodIds.split(';');
         this.prodIds = prids;
    }
     
    request.set_Topics( this.prsources);
    request.set_Fields( this.prodIds);
    ids = [];
    request.set_TopicIds(ids);
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	request.set_CallbackId(ssService._getCallbackId());
    this.filters = [filter];
    request.set_Options(this.filters);
	this.subscribeCallBackFn=callbackFn;
	
	 ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	 request.set_CallbackId(ssService._getCallbackId());
     var promise = ssService._sendRequest(request);
	 if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
		
   } 
	
    
	return ids;	
}

function Thomson$Ssi$NewsHeadlinesManager$unsubscribeWithSubProductId(sourceArray, productIdsArray, callbackFn)
{
    var id, ids, sources, prodIds, request;
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("UnsubscribeToNewsSourceWithSubProductId");
    sources = sourceArray;
    if (typeof (sources) == "string") {
        var src = source.split(';');
        sources = src;
    }
    prodIds = productIdsArray;
    if (typeof (prodIds) == "string") {
        var prids = prodIds.split(';');
        prodIds = prids;
    }
    request.set_Topics(sources);
    request.set_Fields(prodIds);
    ids = [];
    request.set_TopicIds(ids);
     ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	 request.set_CallbackId(ssService._getCallbackId());
     var promise = ssService._sendRequest(request);
    if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
    }
   
}

function Thomson$Ssi$NewsHeadlinesManager$setHeadlineFilter(filterArray, callbackFn) {
    var id, ids, filters;
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("setHeadlineFilter");
    filters = filterArray;
    if (typeof (filters) == "string") {
        var flt = filters.split(';');
        filters = flt;
    }
    request.set_Topics(filters);
    request.set_Fields([]);
    ids = [];
    request.set_TopicIds(ids);
	ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	request.set_CallbackId(ssService._getCallbackId());
    var promise = ssService._sendRequest(request);
    //var promise = Thomson.Ssi._connectionManager._sendRequest(request);
    if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
    }
    return ids;
}

function Thomson$Ssi$NewsHeadlinesManager$setAdvancedHeadlineFilter(filterArray, callbackFn) {
    var id, ids, filters;
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("setAdvancedHeadlineFilter");
    filters = filterArray;
    if (typeof (filters) == "string") {
        var flt = filters.split(';');
        filters = flt;
    }
    request.set_Topics(filters);
    request.set_Fields([]);
    ids = [];
    request.set_TopicIds(ids);
	ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	request.set_CallbackId(ssService._getCallbackId());
    var promise = ssService._sendRequest(request);
    //var promise = Thomson.Ssi._connectionManager._sendRequest(request);
    if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
    }
    return ids;
}

function Thomson$Ssi$NewsHeadlinesManager$unsubscribeAll() {
        var request = new Thomson.Ssi.SubscriptionRequest();
        request.set_Type("unsubscribeAllNewsSources");
        request.set_Fields([]);
        request.set_Topics([]);
        request.set_TopicIds([]);
        request.set_CallbackId(ssService._getCallbackId());
        ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
	    request.set_CallbackId(ssService._getCallbackId());
        var promise = ssService._sendRequest(request);
    }
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////AlertManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Thomson.Ssi.AlertNotificationResponse.prototype = {
    set_msgId1: function (value) {
        this._msgId1 = value;
    },
    set_msgId2: function (value) {
        this._msgId2 = value;
    },
    set_msgId3: function (value) {
        this._msgId3 = value;
    },
    set_msgId4: function (value) {
        this._msgId4 = value;
    },
    set_timeStamp: function (value) {      
        this._timeStamp = value;
    },
    set_expireTime: function (value) {
        this._expireTime = value;
    },
    set_text: function (value) {
        this._text = value;
    },
    set_raw: function (value) {
        this._raw = value;;
    },
    get_raw: function () {
        return this._raw;
    },
    _convertMessageId: Thomson$Ssi$Alert$_convertMessageId,
    _dec2hex: Thomson$Ssi$Alert$_dec2hex,
    _getMSXML: Thomson$Ssi$Alert$_getMSXML,
    _getValue: Thomson$Ssi$Alert$_getValue,
    get_xml: Thomson$Ssi$Alert$get_xml,
    get_messageId: Thomson$Ssi$Alert$get_messageId,
    get_timestamp: Thomson$Ssi$Alert$get_timestamp,
    get_expireTime: Thomson$Ssi$Alert$get_expireTime,
    get_type: Thomson$Ssi$Alert$get_type,
    get_group: Thomson$Ssi$Alert$get_group,
    get_url: Thomson$Ssi$Alert$get_url,
    get_text: Thomson$Ssi$Alert$get_text,
    get_value: Thomson$Ssi$Alert$get_value,
    get_account: Thomson$Ssi$Alert$get_account,
    get_profileId: Thomson$Ssi$Alert$get_profileId,
    get_windowBitMask: Thomson$Ssi$Alert$get_windowBitMask,
    getAttribute: Thomson$Ssi$Alert$getAttribute
}

function Thomson$Ssi$Alert$get_xml()
{
    return this._text;
}

function Thomson$Ssi$Alert$_convertMessageId()
{
    var guid = "";
    if (this._msgId1) {
        guid = this._dec2hex(parseInt(this._msgId1)) + "-";
        var temp = this._dec2hex(parseInt(this._msgId2));
        guid += temp.substr(0, 4) + "-" + temp.substr(4, 4) + "-";
        temp = this._dec2hex(parseInt(this._msgId3));
        guid += temp.substr(0, 4) + "-" + temp.substr(4, 4)
        guid += this._dec2hex(parseInt(this._msgId4));
    }
    return guid;
}


function Thomson$Ssi$Alert$_dec2hex(n)
{
    var padding = 8;
    
    if (n < 0)
    {
        n = 0x100000000 + n;
    }

    var hex = n.toString(16)
    while (hex.length < padding) 
    {        
        hex = "0" + hex;    
    }
    
    return hex;        
}

function Thomson$Ssi$Alert$get_messageId()
{    
        return this._convertMessageId();    
}

function Thomson$Ssi$Alert$get_timestamp()
{
    return this._timeStamp;
}

function Thomson$Ssi$Alert$get_expireTime()
{
    return this._expireTime;
}

function Thomson$Ssi$Alert$get_type()
{
    return this.getAttribute("PD/@CN");
}

function Thomson$Ssi$Alert$get_group()
{
    return this.getAttribute("PD/@Name");
}

function Thomson$Ssi$Alert$get_url()
{
    return this.getAttribute("/URL");
}

function Thomson$Ssi$Alert$get_text()
{
    var txt = this._getValue("/PD");
    txt = txt.replace('<Data>', '');
    txt = txt.replace('</Data>', '');

    return txt;
}

function Thomson$Ssi$Alert$get_value()
{
    return this.getAttribute("PD/@AN");
}

function Thomson$Ssi$Alert$get_account()
{
    return this.getAttribute("/AC");
}

function Thomson$Ssi$Alert$get_profileId()
{
    return this.getAttribute("/ProfileId");
}

function Thomson$Ssi$Alert$get_windowBitMask()
{
    return this.getAttribute("/WindowBitMask");
}

function Thomson$Ssi$Alert$_getMSXML()
{
    if (this._msxml)
    {
        return this._msxml;
    }
    else
    {
        try{
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(this._text, "text/xml");
            return xmlDoc;
        }
        catch(ex){}

        return null;
    }
}

function Thomson$Ssi$Alert$getAttribute(attributeName)
{
    return this._getValue("/" + attributeName);
}

function Thomson$Ssi$Alert$_getValue(xpath) {
    this._msxml = this._getMSXML();
    if (this._msxml) {        
        var node = this._msxml.evaluate(xpath, this._msxml, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;       
       
        if (node) {
            return node.textContent;
        }
    }

    return "";
}





Thomson.Ssi.AlertNotificationManager.prototype =
{   
    registerInstance: Thomson$Ssi$AlertNotificationManager$registerInstance,
    unregisterInstance: Thomson$Ssi$AlertNotificationManager$unregisterInstance,
    close: Thomson$Ssi$AlertNotificationManager$close,
    unsubscribe: Thomson$Ssi$AlertNotificationManager$unsubscribe,
    subscribe: Thomson$Ssi$AlertNotificationManager$subscribe,
    dispose: Thomson$Ssi$AlertNotificationManager$dispose,

}

function Thomson$Ssi$AlertNotificationManager$registerInstance(name) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.registerInstance(name);
}

function Thomson$Ssi$AlertNotificationManager$unregisterInstance(name) {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.unregisterInstance(name);
}
function Thomson$Ssi$AlertNotificationManager$close() {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.close();
}

function Thomson$Ssi$AlertNotificationManager$subscribe(callbackFn) {
    var id, ids, request;
    request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("SubscribeAlert");   
    request.set_Topics([]);
    request.set_Fields(['FID_TIMESTAMP', 'FID_EXPIRE_TIME', 'FID_TEXT', 'FID_MSG_ID1', 'FID_MSG_ID2', 'FID_MSG_ID3', 'FID_MSG_ID4']);
    ids = [];
    request.set_TopicIds(ids);   
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    request.set_CallbackId(ssService._getCallbackId());
    var promise = ssService._sendRequest(request);
    if (callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(callbackFn);
    }
    return ids;
}

function Thomson$Ssi$AlertNotificationManager$unsubscribe() {
    var request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("UnsubscribeAlert");
    request.set_Fields([]);
    request.set_Topics([]);
    request.set_TopicIds([]);
    request.set_CallbackId(ssService._getCallbackId());
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    request.set_CallbackId(ssService._getCallbackId());
    var promise = ssService._sendRequest(request);
}
function Thomson$Ssi$AlertNotificationManager$dispose() {
    this.unsubscribe();
    }

Thomson.Ssi.BrowserType = null;
Thomson.Ssi.XhrRequestUrl = "http://dummy.chromiumsmart.com";

function Thomson$Ssi$Subscription$getSnapshot(symbols, fields) {
    var ids, i = 0, symbol, id;
    var request = new Thomson.Ssi.SubscriptionRequest();
    request.set_Type("snapshot");
    if (this._options) {
        request.set_Options(this._options);
    }
    request.set_Fields(fields);
    syms = symbols;
    if (typeof (symbols) == "string") {
        var syms = symbols.split(';');
        symbols = syms;
    }
    ids = [];
    if (symbols.length > 0) {
        for (i = 0; i < symbols.length; i++) {
            id = this._getCallbackId();
            ids.push(id);
        }
    }
    request.set_Topics(symbols);
    request.set_TopicIds(ids);
    request.set_CallbackId(this._getCallbackId());
    var promise = this._sendRequest(request);
    if (this.callbackFn) {
        // The handler will be invoked when the response comes back
        promise.progress(this.callbackFn);
    }
    return ids;
}

function Thomson$Ssi$Subscription$_sendRequest(request)
{     
    var defer = $.Deferred();
    var callbackId = request.get_CallbackId();
    this._callbacks[callbackId] = {
        time: new Date(),
        cb: defer
    };
    //request.set_CallbackId(callbackId);
    // Take the request and convert it to JSON format
    var message = new Object();
    message.type = request.get_Type();
    message.data = request.get_Data();
    message.callback_id = request.get_CallbackId();
    var jsonString = JSON.stringify(message);
    try {
        if (this._webSocket != null) {
            if (this._webSocket.readyState != 1) {
                if (this._pendingRequests == null)
                    this._pendingRequests = [];
                this._pendingRequests.push(jsonString);
                return defer.promise();
            }
            this._webSocket.send(jsonString);
        }
        else {
            if (Thomson.Ssi._ssiServiceFactory) {
                var ssiManagmentService = Thomson.Ssi._ssiServiceFactory.GetService("Thomson.Financial.Framework.Managed.SSI.ISSIStreamingDataService");
                ssiManagmentService.Send(jsonString);
            }
        }
    }
    catch (e) {
        //if (Sys)
            //Sys.Debug.trace("Thomson.Ssi [Failed to set send " + message.type + "]" + e);
    }
    return defer.promise();
}

function Thomson$Ssi$Subscription$_getEndpoint()
{
    var endpoint;
    if (Thomson.Ssi._ssiServiceFactory) {
        var ssiManagmentService = Thomson.Ssi._ssiServiceFactory.GetService("Thomson.Financial.Framework.Managed.SSI.ISSIManagmentService");
        // Get the endpoint from the Management Service through SSI service factory of frameowrk
        endpoint = ssiManagmentService.Endpoint();        
    }
    else {
        // ToDo: Need to figure out the endpoint if this code is run outside of framework
        return 'ws://localhost:8081/';
    }
    return endpoint;
}

function Thomson$Ssi$Subscription$_listener(data)
{
	var response ;
    var messageObj = data;
    // Heart Beat message
    if (messageObj.type == "onHB" || messageObj.responseType=="onHB") {
        return;
    }
    // If an object exists with callback_id in our callbacks object, resolve it
    if (this._callbacks && this._callbacks.hasOwnProperty(messageObj.callback_id)) {
       	if(messageObj.requestType=="News")
		{
			if(messageObj.responseType!="onError")
		   {
		   response = new Thomson.Ssi.NewsHeadlinesResponse(data)
		   }
			else
			{
			    return;
			}
       	}
       	else if (messageObj.requestType == "Alert") {
       	    if (messageObj.responseType != "onError") {
       	        response = new Thomson.Ssi.AlertNotificationResponse(data)
       	    }
       	    else {
       	        return;
       	    }
       	}
       	else if (messageObj.requestType == "SymbolListManager") {
       	    return;
       	    }       	
       	else if(!response) {
          response = new Thomson.Ssi.SubscriptionResponse(data);
       	}
        var callback = this._callbacks[data.callback_id].cb;
        //if (data.type == "snapshot")
        //    callback.resolve(response);
        //else // onComplete / onData / onError / onStatus
        callback.notify(response);
    }
}
        
// This creates a new callback ID for a request
function Thomson$Ssi$Subscription$_getCallbackId()
{
    this._currentCallbackId += 1;
    if (this._currentCallbackId > 32766) {
        this._currentCallbackId = 0;
    }
    return this._currentCallbackId;
}

function onMessage(event) {
   Tfsi_Snapshot_MessageHandler(null, event);
}

function Tfsi_Snapshot_MessageHandler(sender, event) {
    var ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    if (ssService) {
		if( Thomson.Ssi.BrowserType == "Edge"){
			 if (event.data) {            
                ssService._listener(event.data);
				 return true;
            }
            if (event.EventArgs && event.EventArgs.Message) {
                ssService._listener(JSON.parse(event.EventArgs.Message));
				 return true;
            }

		}	
        ssService._listener(JSON.parse(event.Message));
        return true;
    }
    return false;
}

function InitChromeOverrides() {
    try {
        var match = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        var versionString = match[2];
        var version = parseInt(versionString);
        if (version >= 39) {
            Thomson.Ssi.XhrRequestUrl = "https://dummy.chromiumsmart.com";
        }
    }
    catch (e) {
        //if (Sys)
        //    Sys.Debug.trace(Tfsi.InstanceName + " [Failed to set Tfsi.XhrRequestUrl]" + e);
    }
}
function InitEdgeOverrides()
{
       // chrome.webview.hostObjects.sync.webviewHostObject.SetContext(name, value, updateOnly);
}

$(window).unload(function () {
    ssService = Thomson.Ssi.ServiceFactory.getService("ISubscribe");
    ssService.unregisterInstance("");
    ssService.close();
});

Thomson.Ssi._init();