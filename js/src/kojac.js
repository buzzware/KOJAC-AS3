/*--------------------------------------------------------------------------
 *
 *	Key Oriented JSON Application Cache (KOJAC)
 *	(c) 2011-12 Buzzware Solutions
 *  https://github.com/buzzware/KOJAC
 *
 *	KOJAC is freely distributable under the terms of an MIT-style license.
 *
 *--------------------------------------------------------------------------*/

Kojac = {};

/**
 * @class Kojac.Object
 *
 * Based on :
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/blog/simple-javascript-inheritance/
 * MIT Licensed.
 *
 * Inspired by base2 and Prototype
 *
 * added setup method support inspired by CanJs as used in Kojac.Model
 *
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  // The base JrClass implementation (does nothing)
  this.JrClass = function(aProperties){
	  if (initializing) { // making prototype
	    if (aProperties) {
		    _.extend(this,aProperties);
		    _.cloneComplexValues(this);
	    }
		} else {            // making instance
	    _.cloneComplexValues(this);
	    if (this.init)
		    this.init.call(this,aProperties);
		}
  };
	this.JrClass.prototype.init = function(aProperties) {
		_.extend(this,aProperties);
	};
	this.JrClass.prototype.toJSON = function() { // this adds an instance method used by JSON2 that returns an object containing all immediate and background properties (ie from the prototype)
		return _.clone(this);
	};

  // Create a new JrClass that inherits from this class
	this.JrClass.extend = function(prop) {
    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;

    // The dummy class constructor
    function JrClass(aProperties) {
	    if (initializing) { // making prototype
		    if (aProperties) {
			    _.extend(this,aProperties);
			    _.cloneComplexValues(this);
		    }
			} else {            // making instance
		    _.cloneComplexValues(this);
		    if (this.init)
			    this.init.call(this,aProperties);
			}
    }

		JrClass._superClass = this;

		if (_super.setup)
			prop = _super.setup.call(JrClass,prop);

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
	    var t = typeof prop[name];//_.typeOf(prop[name]);
	    if (t == "function" && typeof _super[name] == "function" && fnTest.test(prop[name])) {
		    prototype[name] =
	        (function(name, fn){
	          return function() {
	            var tmp = this._super;

	            // Add a new ._super() method that is the same method
	            // but on the super-class
	            this._super = _super[name];

	            // The method only need to be bound temporarily, so we
	            // remove it when we're done executing
	            var ret = fn.apply(this, arguments);
	            this._super = tmp;

	            return ret;
	          };
	        })(name, prop[name]);
	    } else if (t==='array' || t==='object') {
        prototype[name] = _.clone(prop[name]);
	    } else {
	      prototype[name] = prop[name];
	    }
    }

    // Populate our constructed prototype object
    JrClass.prototype = prototype;

    // Enforce the constructor to be what we expect
    JrClass.prototype.constructor = JrClass;

    // And make this class extendable
    JrClass.extend = arguments.callee;

    return JrClass;
  };
	Kojac.Object = this.JrClass;
})();


/*
 * @class Kojac.Utils
 *
 * Provides static functions used by Kojac
 */
Kojac.Utils = {

	/**
	 * Converts one or more keys, given in multiple possible ways, to a standard array of strings
	 * @param aKeys one or more keys eg. as array of strings, or single comma-separated list in a single string
	 * @return {Array} array of single-key strings
	 */
	interpretKeys: function(aKeys) {
		if (_.isArray(aKeys))
			return aKeys;
		if (_.isString(aKeys))
			return aKeys.split(',');
		return [];
	},

	/**
	 * Convert object or array to [key1, value, key2, value]
	 * @param aKeyValues array or object of keys with values
	 * @return {Array} [key1, value, key2, value]
	 */
	toKeyValueArray: function(aKeyValues) {
		if (_.isArray(aKeyValues)) {
			var first = aKeyValues[0];
			if (_.isArray(first))         // this style : [[key,value],[key,value]]
				return _.map(aKeyValues,function(o){ return _.flatten(o,true) });
			else if (_.isObject(first))   // this style : [{key: value},{key: value}]
				return _.map(aKeyValues,function(o){ return _.pairs(o) });
			else
				return aKeyValues;          // assume already [key1, value, key2, value]
		} else if (_.isObject(aKeyValues)) {
			return _.flatten(_.pairs(aKeyValues),true); // this style : {key1: value, key2: value}
		} else
			return null;    // unrecognised input
	}

	//public static function getTrailingId(aKey: String): int {
	//	if (!aKey)
	//		return 0;
	//	var parts: Array = aKey.split('__')
	//	if (!parts.length)
	//		return 0;
	//	return StringUtils.toInt(parts[parts.length-1])
	//}
};

/*
 * Function used to determine the data type class of the given value
 * @param {*} aValue
 * @return {Class} eg. see Kojac.FieldTypes
 */
Kojac.getPropertyValueType = function(aValue) {
	var t = _.typeOf(aValue);
	var result;
	switch(t) {
		case 'number':   // determine number or int
			result = (Math.floor(aValue) === aValue) ? Int : Number;
			break;
		default:
		case 'undefined':
		case 'null':
			result = Null;
			break;
		case 'string':
			result = String;
			break;
		case 'boolean':
			result = Boolean;
			break;
		case 'array':
			result = Array;
			break;
		case 'object':
			result = Object;
			break;
		case 'function':
		case 'class':
		case 'instance':
		case 'error':
			result = null;
			break;
	}
	return result;
};


/*
 * Function used to interpret aValue as the given aDestType which is one of the supported data type classes
 * @param {*} aValue any value
 * @param {Class} aDestType Class used to interpret aValue
 * @return {*} aValue interpreted as destination type
 */
Kojac.interpretValueAsType = function(aValue, aDestType) {
	var sourceType = Kojac.getPropertyValueType(aValue);
	if (aDestType===sourceType)
		return aValue;
	switch (aDestType) {
		case String:

			switch(sourceType) {
				case Int:
				case Number:
				case Boolean:
					return aValue.toString();
					break;
				default:
				case Null:
					return null;
					break;
			}

			break;
		case Boolean:

			switch(sourceType) {
				case Null:
				default:
					return null;
					break;
				case Int:
				case Number:
					if (isNaN(aValue))
						return null;
					else
						return !!aValue;
					break;
			}

			break;

		case Number:

			switch(sourceType) {
				case Null:
				default:
					return null;
					break;
				case Boolean:
					return aValue ? 1 : 0;
					break;
				case Int:
					return aValue;
					break;
				case String:
					return Number(aValue);
					break;
			}
			break;

		case Int:

			switch(sourceType) {
				case Null:
				default:
					return null;
					break;
				case Boolean:
					return aValue ? 1 : 0;
					break;
				case Number:
					if (isNaN(aValue))
						return null;
					else
						return Math.round(aValue);
					break;
				case String:
					return Math.round(Number(aValue));
					break;
			}

			break;
		case Object:
			return null;
			break;
		case Array:
			return null;
			break;
	}
	return null;
};

/*
 * Function used to read values from a given source object into the given destination object, using the given aDefinition
 * @param {Object} aDestination
 * @param {Object} aSource
 * @param {Object} aDefinition
 * @return {Object} aDestination object
 */
Kojac.readTypedProperties = function(aDestination, aSource, aDefinition) {
	for (p in aSource) {
		if (p in aDefinition) {
			var value = aSource[p];
			var destType = aDefinition[p];
			if (destType===undefined)
				throw Error('no definition for '+p);
			aDestination[p] = Kojac.interpretValueAsType(value,destType);
		} else if (aDefinition.__options===undefined || aDefinition.__options.allowDynamic===undefined || aDefinition.__options.allowDynamic==true) {
			aDestination[p] = aSource[p];
		}
	};
	return aDestination;
};

/*
 * Returns an array of objects from the cache, based on a prefix and an array of ids
 * @param {String} aPrefix
 * @param {Array} aIds
 * @param {Object} aCache
 * @return {Array} of values from cache
 */
Kojac.collectIds = function(aPrefix,aIds,aCache) {
	var result = [];
	for (var i=0;i<aIds.length;i++)
		result.push(aCache[aPrefix+'__'+aIds[i]]);
	return result;
};


/*
 * Global static function that combines a given array of values (any number of arguments) into a cache key string, joined by double-underscores
 * @return {String} cache key
 */
keyJoin = function() {
	var result;
	for (var i=0;i<arguments.length;i++) {
		var v = arguments[i];
		if (!result)
			result = v.toString();
		else
			result += '__' + v.toString();
	}
	return result;
}

Int = {name: 'Int', toString: function() {return 'Int';}};    // represents a virtual integer type
Null = {name: 'Null', toString: function() {return 'Null';}}; // represents a virtual Null type
Kojac.FieldTypes = [Null,Int,Number,String,Boolean,Date,Array,Object];  // all possible types for fields in Kojac.Model
Kojac.FieldTypeStrings = ['Null','Int','Number','String','Boolean','Date','Array','Object'];  // String names for FieldTypes
Kojac.SimpleTypes = [Null,Int,Number,String,Boolean,Date];  // simple field types in Kojac.Model ie. Object and Array are considered complex

/**
 * Extends Kojac.Object to support typed attributes
 * @class Kojac.Model
 * @extends Kojac.Object
 **/
Kojac.Model = Kojac.Object.extend({
	/**
	 * This method is called when inheriting a new model from Kojac.Model, and allows attributes to be defined as
	 *   name: Class (default value is null)
	 * or
	 *   name: default value (class is inferred)
	 * or
	 *   name: [Class,default value]
	 * @param prop Hash of attributes defined as above
	 * @return Hash of attributes in expected name:value format
	 */
	setup: function(prop) {
		this.__attributes = (this._superClass && this._superClass.__attributes && _.clone(this._superClass.__attributes)) || {};
		//this.__defaults = (constructor.__defaults && _.clone(constructor.__defaults)) || {};
		for (var p in prop) {
			if (['__defaults','__attributes'].indexOf(p)>=0)
				continue;
			var propValue = prop[p];
			if (_.isArray(propValue) && propValue.length===2 && Kojac.FieldTypes.indexOf(propValue[0])>=0) {  // in form property: [Type, Default Value]
				this.__attributes[p] = propValue[0];
				prop[p] = propValue[1];
			} else if (Kojac.FieldTypes.indexOf(propValue) >= 0) {   // field type
				prop[p] = null;
				this.__attributes[p] = propValue;
				//this.__defaults[p] = null;
			} else if (_.isFunction(propValue)) {
				continue;
			} else {        // default value
				var i = Kojac.FieldTypes.indexOf(Kojac.getPropertyValueType(propValue));
				if (i >= 0) {
					this.__attributes[p] = Kojac.FieldTypes[i];
				} else {
					this.__attributes[p] = null;
				}
				//this.__defaults[p] = v;
			}
		}
		return prop;
	},
	/**
	 * The base constructor for Kojac.Model. When creating an instance of a model, an optional hash aValues provides attribute values that override the default values
	 * @param aValues
	 * @constructor
	 */
	init: function(aValues){
		// we don't use base init here
		if (!aValues)
			return;
		for (var p in aValues) {
			if (this.isAttribute(p)) {
				this.attr(p,aValues[p]);
			} else {
				this[p] = aValues[p];
			}
		}
	},

	/**
	 * Determines whether the given name is defined as an attribute in the model definition. Attributes are properties with an additional class and default value
	 * @param aName
	 * @return {Boolean}
	 */
	isAttribute: function(aName) {
		return this.constructor.__attributes && (aName in this.constructor.__attributes);
	},

	/**
	 * Used various ways to access the attributes of a model instance.
	 * 1. attr() returns an object of all attributes and their values
	 * 2. attr(<name>) returns the value of a given attribute
	 * 3. attr(<name>,<value>) sets an attribute to the given value after converting it to the attribute's class
	 * 4. attr({Object}) sets each of the given attributes to the given value after converting to the attribute's class
	 * @param aName
	 * @param aValue
	 * @return {*}
	 */
	attr: function(aName,aValue) {
		if (aName===undefined) {  // read all attributes
			return _.pick(this, _.keys(this.constructor.__attributes));
		} else if (aValue===undefined) {
			if (_.isObject(aName)) {  // write all given attributes
				aValue = aName;
				aName = undefined;
				if (!this.constructor.__attributes)
					return {};
				_.extend(this,_.pick(aValue,_.keys(this.constructor.__attributes)))
			} else {                  // read single attribute
				return (_.has(this.constructor.__attributes,aName) && this[aName]) || undefined;
			}
		} else {  // write single attribute
			var t = this.constructor.__attributes[aName];
			if (t)
				aValue = Kojac.interpretValueAsType(aValue,t);
			return (this[aName]=aValue);
		}
	}
});

/**
 * Provides a dynamic asynchronous execution model. Handlers are added in queue or stack style, then executed in order, passing a given context object to each handler.
 * HandlerStack is a Javascript conversion of HandlerStack in the ActionScript Kojac library.
 * @class HandlerStack
 * @extends Kojac.Object
 */
HandlerStack = Kojac.Object.extend({
	handlers: null,
	parameters: null,
	thises: null,
	parameter: null,
	context: null,
	error: null,
	deferred: null,
	nextHandlerIndex: -1,
	waitForCallNext: false,

	/**
	 * @constructor
	 */
	init: function() {
		this._super.apply(this,arguments);
		this.clear();
	},

	// clears out all handlers and state
	clear: function() {
		this.handlers = [];
		this.parameters = [];
		this.thises = [];
		this.reset();
	},

	// clears execution state but keeps handlers and parameters for a potential re-call()
	reset: function() {
		this.parameter = null;
		this.context = null;
		this.error = null;
		this.deferred = null;
		this.nextHandlerIndex = -1;
		this.waitForCallNext = false;
	},

	push: function (aFunction, aParameter, aThis) {
		this.handlers.unshift(aFunction);
		this.parameters.unshift(aParameter);
		this.thises.unshift(aThis);
	},

	// push in function and parameters to execute next
	pushNext: function(aFunction, aParameter,aThis) {
		if (this.nextHandlerIndex<0)
			return this.push(aFunction,aParameter,aThis);
		this.handlers.splice(this.nextHandlerIndex,0,aFunction);
		this.parameters.splice(this.nextHandlerIndex,0,aParameter);
		this.thises.splice(this.nextHandlerIndex,0,aThis);
	},

	add: function(aFunction, aParameter, aThis) {
		this.handlers.push(aFunction);
		this.parameters.push(aParameter);
		this.thises.push(aThis);
	},

	callNext: function() {
		if (this.context.error) {
			if (!this.context.isRejected())
				this.deferred.reject(this.context);
			return;
		}
		if ((this.handlers.length===0) || (this.nextHandlerIndex>=this.handlers.length)) {
			this.deferred.resolve(this.context);
			return;
		}
		var fn = this.handlers[this.nextHandlerIndex];
		var d = this.parameters[this.nextHandlerIndex];
		var th = this.thises[this.nextHandlerIndex];
		this.nextHandlerIndex++;
		var me = this;
		setTimeout(function() {
			me.executeHandler(fn, d, th);
		}, 0);
	},

	handleError: function(aError) {
		this.context.error = aError;
		this.deferred.reject(this.context);
	},

	executeHandler: function(fn,d,th) {
		this.waitForCallNext = false;
		try {
			this.parameter = d;
			if (th)
				fn.call(th,this.context);
			else
				fn(this.context);
		} catch (e) {
			this.handleError(e);
		}
		if (!(this.waitForCallNext)) {
			this.callNext();
		}
	},

	execute: function(aContext) {
		this.context = aContext;
		this.deferred = jQuery.Deferred();
		this.deferred.promise(this.context);
		if (this.context.isResolved===undefined)
			this.context.isResolved = _.bind(
				function() {
					return this.state()==='resolved'
				},
				this.context
			);
		if (this.context.isRejected===undefined)
			this.context.isRejected = _.bind(
				function() {
					return this.state()==='rejected'
				},
				this.context
			);
		if (this.context.isPending===undefined)
			this.context.isPending = _.bind(
				function() {
					return this.state()==='pending'
				},
				this.context
			);
		this.nextHandlerIndex = 0;
		this.callNext();
		return this.context;
	}
});


/**
 * Represents a single Kojac operation ie. READ, WRITE, UPDATE, DELETE or EXECUTE
 * @class Kojac.Operation
 * @extends Kojac.Object
 */
Kojac.Operation = Kojac.Object.extend({
	request: this,
	verb: null,
	key: null,
	value: undefined,
	results: {},
	result_key: null,
	result: undefined,
	error: null,         // set with some truthy error if this operation fails
	performed: false,
	fromCache: null,     // null means not performed, true means got from cache, false means got from server. !!! Should split this into performed and fromCache
	receiveResult:function (aResponseOp) {
		if (!aResponseOp) {
			this.error = "no result";
		} else if (aResponseOp.error) {
			this.error = aResponseOp.error;
		} else {
			var request_key = this.result_key || this.key;
			var response_key = aResponseOp.result_key || this.key;
			var final_result_key = this.result_key || response_key; // result_key should not be specified unless trying to override
			var results = _.isObjectStrict(aResponseOp.results) ? aResponseOp.results : _.createObject(response_key,aResponseOp.results); // fix up server mistake
			var result = results[response_key];
			results = _.omit(results,response_key); // results now excludes primary result
			_.extend(this.results,results);   // store other results
			this.result_key = final_result_key;
			this.results[final_result_key] = result;  // store primary result
		}
	}
});

/**
 * Represents a single Kojac request, analogous to a HTTP request. It may contain 1 or more operations
 * @class Kojac.Request
 * @extends Kojac.Object
 */
Kojac.Request = Kojac.Object.extend({
		kojac: null,
		options: {},
		ops: [],
		handlers: null,
		op: null,
		result: undefined,
		results: {},
		error: null,        // set with some truthy value if this whole request or any operation fails (will contain first error if multiple)
		newOperation: function() {
			var obj = new Kojac.Operation({request: this});
			if (this.ops.length===0)
				this.op = obj;
			this.ops.push(obj);
			return obj;
		},

		init: function(aProperties) {
			this._super.apply(this,arguments);
			this.handlers = new HandlerStack();
		},

		// {key: value} or [{key1: value},{key2: value}] or {key1: value, key2: value}
		create: function(aKeyValues,aOptions) {

			var result_key = aOptions && _.removeKey(aOptions,'result_key');
			var params = aOptions && _.removeKey(aOptions,'params');  // extract specific params
			var options = aOptions ? _.extend({cacheResults: true},aOptions) : {}; // extract known options

			var kvArray = Kojac.Utils.toKeyValueArray(aKeyValues);
			for (var i=0;i<kvArray.length-1;i+=2) {
				var k = kvArray[i];
				var v = kvArray[i+1];
				var op = this.newOperation();
				op.verb = 'CREATE';
				op.options = _.clone(options);
				op.params = params && _.clone(params);
				op.key = k;
				if ((i===0) && result_key)
					op.result_key = result_key;
				op.value = v;
			}
			return this;
		},

		// !!! if aKeys is String, split on ',' into an array
		// known options will be moved from aOptions to op.options; remaining keys will be put into params
		read: function(aKeys,aOptions) {
			var keys = Kojac.Utils.interpretKeys(aKeys);
			var result_key = aOptions && _.removeKey(aOptions,'result_key');  // extract result_key
			var params = aOptions && _.removeKey(aOptions,'params');  // extract specific params
			var options = aOptions ? _.extend({cacheResults: true},aOptions) : {}; // extract known options
			var me = this;
			jQuery.each(keys,function(i,k) {
				var op = me.newOperation();
				op.options = _.clone(options);
				op.params = params && _.clone(params);
				op.verb = 'READ';
				op.key = k;
				if (i===0)
					op.result_key = result_key || k;
				else
					op.result_key = k;
			});
			return this;
		},

		cacheRead: function(aKeys,aOptions) {
			aOptions = _.extend({},aOptions,{preferCache: true});
			return this.read(aKeys,aOptions);
		},

		update: function(aKeyValues,aOptions) {
			var result_key = aOptions && _.removeKey(aOptions,'result_key');
			var options = aOptions ? _.extend({cacheResults: true},aOptions) : {}; // extract known options
			var params = aOptions && _.removeKey(aOptions,'params');  // extract specific params
			var first=true;
			var kvArray = Kojac.Utils.toKeyValueArray(aKeyValues);
			for (var i=0;i<kvArray.length-1;i+=2) {
				var k = kvArray[i];
				var v = kvArray[i+1];
				var op = this.newOperation();
				op.verb = 'UPDATE';
				op.options = _.clone(options);
				op.params = params && _.clone(params);
				op.key = k;
				if (first) {
					op.result_key = result_key || k;
					first = false;
				} else
					op.result_key = k;
				op.value = v;
			};
			return this;
		},

		destroy: function(aKeys,aOptions) {
			var keys = Kojac.Utils.interpretKeys(aKeys);
			var result_key = aOptions && _.removeKey(aOptions,'result_key');
			var options = aOptions ? _.extend({cacheResults: true},aOptions) : {}; // extract known options
			var params = aOptions && _.removeKey(aOptions,'params');  // extract specific params
			var me = this;
			jQuery.each(keys,function(i,k) {
				var op = me.newOperation();
				op.options = _.clone(options);
				op.params = params && _.clone(params);
				op.verb = 'DESTROY';
				op.key = k;
				if (i===0)
					op.result_key = result_key || k;
				else
					op.result_key = k;
			});
			return this;
		},

		execute: function(aKey,aValue,aOptions) {
			var op = this.newOperation();
			op.verb = 'EXECUTE';

			var params = aOptions && _.removeKey(aOptions,'params');  // extract specific params
			op.result_key = aOptions && _.removeKey(aOptions,'result_key') || aKey;
			op.options = aOptions ? _.extend({cacheResults: false},aOptions) : {}; // extract known options
			op.params = params && _.clone(params);
			op.key = aKey;
			op.value = aValue;
			return this;
		},

		request: function() {
			return this.kojac.performRequest(this);
		}
});

/**
 * The Kojac core object
 * @class Kojac.Core
 * @extends Kojac.Object
 */
Kojac.Core = Kojac.Object.extend({

		remoteProvider: null,
		objectFactory: null,
		cache: null,
		dependentKeys: {},

		newRequest: function() {
			return new Kojac.Request({kojac: this});
		},

		cacheResults: function(aRequest) {
			if (this.cache.beginPropertyChanges)
				this.cache.beginPropertyChanges();
			for (var i=0;i<aRequest.ops.length;i++) {
				var op = aRequest.ops[i];
				if (op.error)
					break;
				if (op.options.cacheResults===false)
					continue;
				for (p in op.results) {
					if (p==op.result_key)
						continue;
					if (op.results[p]===undefined)
						delete this.cache[p];
					else
						this.cache[p] = op.results[p];
				}
				if (op.results[op.result_key]===undefined)
					delete this.cache[op.result_key];
				else
					this.cache[op.result_key] = op.results[op.result_key];
			}
			if (this.cache.endPropertyChanges)
				this.cache.endPropertyChanges();
		},

		cacheHasKeys: function(aKeysArray) {
			var me = this;
			return _.all(aKeysArray,function(k){
				return k in me.cache;
			})
		},

		cacheValues: function(aKeysArray) {
			var me = this;
			return _.map(aKeysArray,function(k){
				return me.cache[k];
			})
		},

		finaliseRequest: function(aRequest) {
			// set convenience properties
			var results = {};
			for (var i=0;i<aRequest.ops.length;i++) {
				var op = aRequest.ops[i];
				if (op.error && !aRequest.error)
					aRequest.error = op.error;
				_.extend(results,op.results);
				op.result = !op.error && op.results && (op.result_key || op.key) ? op.results[op.result_key || op.key] : null;
				if (i===0) {
					aRequest.op = op;
				}
		    if ((op.performed===true) && (op.fromCache===false) && (op.options.cacheResults!==false)) {
			    var ex_key = (op.result_key || op.key);
			    var dep_keys = [];
			    for (var p in op.results) {
				    if (p===ex_key)
				      continue;
				    dep_keys.push(p);
			    }
			    if (!dep_keys.length) {
			      if (op.key in aRequest.kojac.dependentKeys)
			        delete aRequest.kojac.dependentKeys[op.key];
				  } else {
		        aRequest.kojac.dependentKeys[op.key] = dep_keys
			    }
		    }
			}
			aRequest.results = results;
			aRequest.result = aRequest.op && aRequest.op.result;
		},

		performRequest: function(aRequest) {
			for (var i=0;i<aRequest.ops.length;i++) {
				var op = aRequest.ops[i];
				var k = (op.result_key && (op.result_key !== op.key)) ? op.result_key : op.key;
				if (op.verb=='READ' && op.options.preferCache && (k in aRequest.kojac.cache)) {   // resolve from cache
					op.results[k] = aRequest.kojac.cache[k];
					var dep_keys = aRequest.kojac.dependentKeys[op.key];
					if (dep_keys) {
						for (var i=0;i<dep_keys.length;i++) {
							var dk = dep_keys[i];
							// what if not in cache? perhaps dump siblings in dependentKeys and index key to cause full refresh? or refuse to remove from cache if in dependentKeys
							op.results[dk] = aRequest.kojac.cache[dk];
						}
					}
					op.result_key = k;
					op.fromCache = true;
					op.performed = true;
				}
			}
			aRequest.handlers.add(this.remoteProvider.handleAjaxRequest,null,this.remoteProvider);
			if (this.objectFactory && this.objectFactory.transformResultsToValueObjects)
				aRequest.handlers.add(this.objectFactory.transformResultsToValueObjects,null,this.objectFactory);
			if (this.cache.cacheResults)
				aRequest.handlers.add(this.cache.cacheResults,null,this.cache);
			else
				aRequest.handlers.add(this.cacheResults,null,this);
			aRequest.handlers.execute(aRequest).then(this.finaliseRequest);
			return aRequest;
		},

		// BEGIN User Functions

		// These functions enable the user to build and trigger requests to the server/remote provider
		// eg. kojac.read('cur_super').read('cur_super_products').request()
		// or  kojac.readRequest('cur_super','cur_super_products')

		create: function(aKeyValues,aOptions) {
			var req = this.newRequest();
			return req.create(aKeyValues,aOptions);
		},
		createRequest: function(aKeyValues,aOptions) {
			return this.create(aKeyValues,aOptions).request();
		},

		read: function(aKeys,aOptions) {
			var req = this.newRequest();
			return req.read(aKeys,aOptions);
		},
		readRequest: function(aKeys,aOptions) {
			return this.read(aKeys,aOptions).request();
		},
		cacheReadRequest: function(aKeys,aOptions) {
			aOptions = _.extend({},aOptions,{preferCache: true});
			return this.read(aKeys,aOptions).request();
		},
		cacheRead: function(aKeys,aOptions) {
			aOptions = _.extend({},aOptions,{preferCache: true});
			return this.read(aKeys,aOptions);
		},

		update: function(aKeyValues,aOptions) {
			var req = this.newRequest();
			return req.update(aKeyValues,aOptions);
		},
		updateRequest: function(aKeyValues,aOptions) {
			return this.update(aKeyValues,aOptions).request();
		},

		destroy: function(aKeys,aOptions) {
			var req = this.newRequest();
			return req.destroy(aKeys,aOptions);
		},
		destroyRequest: function(aKeys,aOptions) {
			return this.destroy(aKeys,aOptions).request();
		},

		execute: function(aKey,aValue,aOptions) {
			var req = this.newRequest();
			return req.execute(aKey,aValue,aOptions);
		},
		executeRequest: function(aKey,aValue,aOptions) {
			return this.execute(aKey,aValue,aOptions).request();
		}
		// END Convenience Functions
});

/**
 * A default RemoteProvider implementation. Your own implementation, or a subclass of this may be used instead.
 * @class Kojac.RemoteProvider
 * @extends Kojac.Object
 */
Kojac.RemoteProvider = Kojac.Object.extend({

	useMockFileValues: false,
	mockFilePath: null,
	mockReadOperationHandler: null,
	serverPath: null,

	mockWriteOperationHandler: null,//function(aOp) {
//		console.log(JSON.stringify(CanUtils.copyProperties({},aOp,null,['request'])));
//	},

	operationsToJson: function(aOps) {
		var result = [];
		for (var i=0;i<aOps.length;i++) {
			var op = aOps[i];
			var jsonOp = {
				verb: op.verb,
				key: op.key
			};
			if ((op.verb==='CREATE') || (op.verb==='UPDATE') || (op.verb==='EXECUTE'))
				jsonOp.value = op.value;
			var options = op.options && _.omit(op.options,['cacheResults','preferCache']);
			if (options && !_.isEmpty(options))
				jsonOp.options = options;   // omit local keys
			result.push(jsonOp);
		}
		return result
	},

	handleAjaxRequest: function(aRequest) {
		var result;
		var op;
		for (var i=0;i<aRequest.ops.length;i++) {
			op = aRequest.ops[i];
			if (op.performed)
				continue;
			if (op.verb==='READ' || op.verb==='EXECUTE') {
				if (this.mockReadOperationHandler) {
					result = this.mockReadOperationHandler(op);
					op.performed = true;
					if (op.fromCache===null)
						op.fromCache = false;
					return result;
				}
			} else {
				if (this.mockWriteOperationHandler) {
					result = this.mockWriteOperationHandler(op);
					op.performed = true;
					if (op.fromCache===null)
						op.fromCache = false;
					return result;
				}
			}
		}
		var server_ops = _.filterByCriteria(aRequest.ops,{performed: false});
		if (!server_ops.length)
			return;
		if (this.useMockFileValues) {
			aRequest.handlers.waitForCallNext = true;
			var me = this;
			var getMockFile = function(aOp) {
				var fp = me.mockFilePath+aOp.key+'.js';
				var data = null;
				return jQuery.ajax({url: fp, dataType: 'json', cache: false, data: data}).done(
					function( aData ) {
						for (p in aData) {
							if (p==='results') {
								for (k in aData.results) {
									if (k===aOp.key && (aOp.result_key!=aOp.key))
										aOp.results[aOp.result_key] = aData.results[k];
									else
										aOp.results[k] = aData.results[k];
								}
							} else
								aOp[p] = aData[p];
						}
						aOp.receiveResult(aOp);
						this.fromCache = false;
						this.performed = true;
					}
				).fail(
					function(jqXHR, textStatus) {
						aRequest.handlers.handleError(textStatus);
					}
				);
			};
			var reqs = [];
			for (var i=0;i<aRequest.ops.length;i++) {
				reqs.push(getMockFile(aRequest.ops[i]));
			}
			jQuery.when.apply(jQuery,reqs).then(function(){
				aRequest.handlers.callNext();
			});
		} else {
			var opsJson = this.operationsToJson(server_ops);
			var dataToSend = {
				format: 'KOJAC-1.0',
				ops: opsJson
			};
			aRequest.handlers.waitForCallNext = true;
			var ajaxpars = {
				type: 'POST',
				data: JSON.stringify(dataToSend),
				contentType: "application/json; charset=utf-8",
				dataType: "json"
			};
			var result = jQuery.ajax(this.serverPath,ajaxpars).done(function(aResult,aStatus,aXhr){
				// poke results into request ops using request_op_index
				aRequest.xhr = aXhr;
				for (var i=0;i<server_ops.length;i++) {
					var opRequest = server_ops[i]; //aRequest.ops[request_op_index[i]];
					var opResult = (_.isArray(aResult.ops) && (i<aResult.ops.length) && aResult.ops[i]);
					opRequest.receiveResult(opResult);
					opRequest.fromCache = false;
					opRequest.performed = true;
				}
				aRequest.handlers.callNext();
			}).fail(function(aXhr,aStatus,aError){
				for (var i=0;i<server_ops.length;i++) {
					var opRequest = server_ops[i]; //aRequest.ops[request_op_index[i]];
					opRequest.fromCache = false;
					opRequest.performed = true;
				}
				aRequest.error = aXhr;
				aRequest.handlers.handleError(aXhr);
				aRequest.handlers.callNext();
			});
		}
	}
});

/**
 * A default ObjectFactory implementation. Your own implementation, or a subclass of this may be used instead.
 * @class Kojac.ObjectFactory
 * @extends Kojac.Object
 */
Kojac.ObjectFactory = Kojac.Object.extend({

	matchers: null,
	defaultClass: Object,

	register: function(aPairs) {
		if (!aPairs)
			return;
		if (this.matchers===null)
			this.matchers = [];
		for (var i = 0; i < aPairs.length; i++)
			this.matchers.push(aPairs[i]);
	},

	classFromKey: function(aKey) {
		var pair;
		var re;
		var newClass;
		for (var i = 0; i < this.matchers.length; i++) {
			pair = this.matchers[i];
			re = pair[0];
			if (!re.test(aKey))
				continue;
			newClass = pair[1];
			break;
		}
		if (newClass===undefined)
			newClass = this.defaultClass;
		return newClass;
	},

	createInstance: function(aClass,aProperties) {
		aProperties = aProperties || {};
		return new aClass(aProperties);
	},

	copyProperties: function(aDest,aSource) {
		return _.extend(aDest,aSource);
	},

	manufacture: function(aObject,aKey) {
		var newClass = this.classFromKey(aKey);
		var result;
		var me = this;
		if (_.isArray(aObject)) {
			result = [];
			for (var i=0; i<aObject.length; i++) {
				var newv = me.createInstance(newClass,aObject[i]);
				result.push(newv);
			}
		} else {
			var newClass = this.classFromKey(aKey);
			result = me.createInstance(newClass,aObject);
		}
		return result;
	},

	transformResultsToValueObjects: function(aRequest) {
		for (var i=0;i<aRequest.ops.length;i++) {
			var op = aRequest.ops[i];
			if (op.error)
				break;
			for (var k in op.results) {
				var v = op.results[k];
				if (!jQuery.isPlainObject(v))
					continue;
				op.results[k] = this.manufacture(v,k);
			}
		}
	}

});

