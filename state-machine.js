(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/Script/lib/state-machine.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '384dbJKVNFONLLqdNdmAYr8', 'state-machine', __filename);
// Script/lib/state-machine.js

'use strict';

/*

  Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine

  Copyright (c) 2012, 2013, 2014, 2015, Jake Gordon and contributors
  Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE

*/

(function () {

  var StateMachine = {

    //---------------------------------------------------------------------------

    VERSION: "2.4.0",

    //---------------------------------------------------------------------------

    Result: {
      SUCCEEDED: 1, // the event transitioned successfully from one state to another
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary
      CANCELLED: 3, // the event was cancelled by the caller in a beforeEvent callback
      PENDING: 4 // the event is asynchronous and the caller is in control of when the transition occurs
    },

    Error: {
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
      INVALID_CALLBACK: 300 // caller provided callback function threw an exception
    },

    WILDCARD: '*',
    ASYNC: 'async',

    //---------------------------------------------------------------------------

    create: function create(cfg, target) {

      var initial = typeof cfg.initial == 'string' ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var terminal = cfg.terminal || cfg['final'];
      var fsm = target || cfg.target || {};
      var events = cfg.events || [];
      var callbacks = cfg.callbacks || {};
      var map = {}; // track state transitions allowed for an event { event: { from: [ to ] } }
      var transitions = {}; // track events allowed from a state            { state: [ event ] }

      var add = function add(e) {
        var from = Array.isArray(e.from) ? e.from : e.from ? [e.from] : [StateMachine.WILDCARD]; // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};
        for (var n = 0; n < from.length; n++) {
          transitions[from[n]] = transitions[from[n]] || [];
          transitions[from[n]].push(e.name);

          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
        }
        if (e.to) transitions[e.to] = transitions[e.to] || [];
      };

      if (initial) {
        initial.event = initial.event || 'startup';
        add({ name: initial.event, from: 'none', to: initial.state });
      }

      for (var n = 0; n < events.length; n++) {
        add(events[n]);
      }for (var name in map) {
        if (map.hasOwnProperty(name)) fsm[name] = StateMachine.buildEvent(name, map[name]);
      }

      for (var name in callbacks) {
        if (callbacks.hasOwnProperty(name)) fsm[name] = callbacks[name];
      }

      fsm.current = 'none';
      fsm.is = function (state) {
        return Array.isArray(state) ? state.indexOf(this.current) >= 0 : this.current === state;
      };
      fsm.can = function (event) {
        var a = map[event] !== undefined;
        var b = map[event].hasOwnProperty(this.current);
        return !this.transition && map[event] !== undefined && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD));
      };
      fsm.cannot = function (event) {
        return !this.can(event);
      };
      fsm.transitions = function () {
        return (transitions[this.current] || []).concat(transitions[StateMachine.WILDCARD] || []);
      };
      fsm.isFinished = function () {
        return this.is(terminal);
      };
      fsm.error = cfg.error || function (name, from, to, args, error, msg, e) {
        throw e || msg;
      }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)
      fsm.states = function () {
        return Object.keys(transitions).sort();
      };

      if (initial && !initial.defer) fsm[initial.event]();

      return fsm;
    },

    //===========================================================================

    doCallback: function doCallback(fsm, func, name, from, to, args) {
      if (func) {
        try {
          return func.apply(fsm, [name, from, to].concat(args));
        } catch (e) {
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }
      }
    },

    beforeAnyEvent: function beforeAnyEvent(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onbeforeevent'], name, from, to, args);
    },
    afterAnyEvent: function afterAnyEvent(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onafterevent'] || fsm['onevent'], name, from, to, args);
    },
    leaveAnyState: function leaveAnyState(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onleavestate'], name, from, to, args);
    },
    enterAnyState: function enterAnyState(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onenterstate'] || fsm['onstate'], name, from, to, args);
    },
    changeState: function changeState(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onchangestate'], name, from, to, args);
    },

    beforeThisEvent: function beforeThisEvent(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onbefore' + name], name, from, to, args);
    },
    afterThisEvent: function afterThisEvent(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onafter' + name] || fsm['on' + name], name, from, to, args);
    },
    leaveThisState: function leaveThisState(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onleave' + from], name, from, to, args);
    },
    enterThisState: function enterThisState(fsm, name, from, to, args) {
      return StateMachine.doCallback(fsm, fsm['onenter' + to] || fsm['on' + to], name, from, to, args);
    },

    beforeEvent: function beforeEvent(fsm, name, from, to, args) {
      if (false === StateMachine.beforeThisEvent(fsm, name, from, to, args) || false === StateMachine.beforeAnyEvent(fsm, name, from, to, args)) return false;
    },

    afterEvent: function afterEvent(fsm, name, from, to, args) {
      StateMachine.afterThisEvent(fsm, name, from, to, args);
      StateMachine.afterAnyEvent(fsm, name, from, to, args);
    },

    leaveState: function leaveState(fsm, name, from, to, args) {
      var specific = StateMachine.leaveThisState(fsm, name, from, to, args),
          general = StateMachine.leaveAnyState(fsm, name, from, to, args);
      if (false === specific || false === general) return false;else if (StateMachine.ASYNC === specific || StateMachine.ASYNC === general) return StateMachine.ASYNC;
    },

    enterState: function enterState(fsm, name, from, to, args) {
      StateMachine.enterThisState(fsm, name, from, to, args);
      StateMachine.enterAnyState(fsm, name, from, to, args);
    },

    //===========================================================================

    buildEvent: function buildEvent(name, map) {
      return function () {

        var from = this.current;
        var to = map[from] || (map[StateMachine.WILDCARD] != StateMachine.WILDCARD ? map[StateMachine.WILDCARD] : from) || from;
        var args = Array.prototype.slice.call(arguments); // turn arguments into pure array

        if (this.transition) return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

        if (this.cannot(name)) return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

        if (false === StateMachine.beforeEvent(this, name, from, to, args)) return StateMachine.Result.CANCELLED;

        if (from === to) {
          StateMachine.afterEvent(this, name, from, to, args);
          return StateMachine.Result.NOTRANSITION;
        }

        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;
        this.transition = function () {
          fsm.transition = null; // this method should only ever be called once
          fsm.current = to;
          StateMachine.enterState(fsm, name, from, to, args);
          StateMachine.changeState(fsm, name, from, to, args);
          StateMachine.afterEvent(fsm, name, from, to, args);
          return StateMachine.Result.SUCCEEDED;
        };
        this.transition.cancel = function () {
          // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;
          StateMachine.afterEvent(fsm, name, from, to, args);
        };

        var leave = StateMachine.leaveState(this, name, from, to, args);
        if (false === leave) {
          this.transition = null;
          return StateMachine.Result.CANCELLED;
        } else if (StateMachine.ASYNC === leave) {
          return StateMachine.Result.PENDING;
        } else {
          if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
            return this.transition();
        }
      };
    }

  }; // StateMachine

  //===========================================================================

  //======
  // NODE
  //======
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = StateMachine;
    }
    exports.StateMachine = StateMachine;
  }
  //============
  // AMD/REQUIRE
  //============
  else if (typeof define === 'function' && define.amd) {
      define(function (require) {
        return StateMachine;
      });
    }
    //========
    // BROWSER
    //========
    else if (typeof window !== 'undefined') {
        window.StateMachine = StateMachine;
      }
      //===========
      // WEB WORKER
      //===========
      else if (typeof self !== 'undefined') {
          self.StateMachine = StateMachine;
        }
})();

cc._RF.pop();
        }
        if (CC_EDITOR) {
            __define(__module.exports, __require, __module);
        }
        else {
            cc.registerModuleFunc(__filename, function () {
                __define(__module.exports, __require, __module);
            });
        }
        })();
        //# sourceMappingURL=state-machine.js.map
        