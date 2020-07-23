let StartFsmType = cc.Enum({
        To_step1:0,
});

// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html
cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //     // ATTRIBUTES:
        //     default: null,        // The default value will be used only when the component attaching
        //                           // to a node for the first time
        //     type: cc.SpriteFrame, // optional, default is typeof default
        //     serializable: true,   // optional, default is true
        // },
        // bar: {
        //     get () {
        //         return this._bar;
        //     },
        //     set (value) {
        //         this._bar = value;
        //     }
        // },
        start_fsm: {
            default: false,
            tooltip: CC_DEV && '自动开始状态机☺',
        },
	    _startFsmType: StartFsmType.To_step1,
	    startFsmMachine: {
		    type: StartFsmType,
		    get() {
			    return this._startFsmType;
		    },
		    set(val) {
			    this._startFsmType = val;
		    },
		    tooltip: CC_DEV && "状态机从哪里开始?",
	    },
        global_mode: {
            default: false,
            tooltip: CC_DEV && '全局么☻',
        },
        debug_mode: {
            default: false,
            tooltip: CC_DEV && '你可以开启调试了☺',
        },
        OnTestStateStateMachineInit: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: CC_DEV && '初始化☺',
        },
        onEnterNone: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: CC_DEV && '[进入状态]',
        },
        onEnterStep1: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: CC_DEV && '[进入状态]第一步',
        },
        onEnterStep2: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: CC_DEV && '[进入状态]第二步',
        },
    },

    // LIFE-CYCLE CALLBACKS:
    _createfsm() {
        let StateMachine = require('state-machine');
        let fsmData = {
            //initial: 'nope',
            //please select the enter-state here
            events: [
                {name:"to_step1", from:"none", to: "step1"},
                {name:"to_step2", from:"step1", to: "step2"},
            ],
            error: (name, from, to, args, error, msg, e) => {
                let descs = {
                    "none": "",
                    "step1": "第一步",
                    "step2": "第二步",
                };
                throw e || new Error(cc.js.formatStr("[ERROR] [TestState] %s \n [%s, %s(%s)->%s(%s)] ", msg, name, from, descs[from], to, descs[to]));
            },
        };

        let fsm = StateMachine.create(fsmData);
        fsm.ASYNC = StateMachine.ASYNC;
        return fsm;
    },

    _bindfsm(fsm) {

        let signfunc = function(param) {
            if (param == "obj") {
                cc.error("cannot be obj");
            }

            let tbl = {};

            let func = function(isreturn) {
                tbl[param] = isreturn;
            };

            let resultfunc = function(isreturn) {
                let ret = tbl[param];
                tbl[param] = null;
                return ret;
            };

            tbl.func = func;
            tbl.resultfunc = resultfunc;
            return tbl;
        };

        let self = this;
        let bindcommonfunc = function(funcpairs) {
            for (let i = 0; i < funcpairs.length; i++) {
                let name = funcpairs[i][0];
                let func = funcpairs[i][1];
                let signfunc = funcpairs[i][2];

                if (!!!func) {
                    return;
                }

                fsm[name] = function(...args) {
                    let descs = {
                        "none": "",
                        "step1": "第一步",
                        "step2": "第二步",
                    };
                    let sname = args[0];
                    let sfrom = args[1];
                    let sto = args[2];
                    if (self.debug_mode) {
                        console.log(cc.js.formatStr("[DEBUG] [TestState]:[%s] %s(%s) => %s => %s(%s)", name, sfrom, descs[sfrom], sname, sto, descs[sto]));
                    }
                    let leftArgs = args.slice(3);
                    cc.Component.EventHandler.emitEvents(func, fsm, sname, sfrom, sto, ...leftArgs);
                    return signfunc && signfunc.resultfunc();
                };
            }
        };

        let bindstatefunc = function(statename, onenterStatefunc) {
            bindcommonfunc([
                ["onenter" + statename, onenterStatefunc],
            ]);
        };

        let bindeventfunc = function(eventname, onbeforeEventfunc, onafterEventfunc) {
            bindcommonfunc([
                ["onbefore" + eventname, onbeforeEventfunc, signfunc("return")],
                ["onafter" + eventname, onafterEventfunc]
            ]);
        };

        // anystate
        // anystatechange
        // anyevent

        // state
        bindstatefunc("step2", this.onEnterStep2);
        bindstatefunc("step1", this.onEnterStep1);
    },

    startfsm() {
        let startFsmTypeName  = [
            "to_step1",
        ];
        this.fsm[startFsmTypeName[this.startFsmMachine]]();
    },

    bindTargetActions(target) {
        let actionNames = [
            "OnTestStateStateMachineInit",
            "onEnterNone",
            "onEnterStep1",
            "onEnterStep2",
        ];
        for (let i = 0; i < actionNames.length; i++) {
            let actionName = actionNames[i];
            if (target[actionName]) {
                let eventHandler = new cc.Component.EventHandler();
                eventHandler.target = target.node;
                eventHandler.component = (target.name).replace("<", "$").replace(">", "$").split("$")[1];
                eventHandler.handler = actionName;
                this[actionName].push(eventHandler);
            }
        }
    },

    removeTargetActions(target) {
        let actionNames = [
            "OnTestStateStateMachineInit",
            "onEnterNone",
            "onEnterStep1",
            "onEnterStep2",
        ];
        for (let i = 0; i < actionNames.length; i++) {
            let actionName = actionNames[i];
            for (let j = 0; this[actionName] && j < this[actionName].length;) {
                let oneAction = this[actionName][j];
                if (oneAction.target.uuid == target.node.uuid) {
                    this[actionName].splice(j, 1);
                } else {
                    j++;
                }
            }
        }
    },

    initComp() {
        this.fsm = this._createfsm();
        this._bindfsm(this.fsm);
        if (cc.TestState == null && this.global_mode) {
            cc.TestState = this;
        }
    },

    onLoad() {
        this.initComp();
    },

    onDestroy() {
        if (this.global_mode && cc.TestState) {
            cc.TestState = null;
        }
    },

    start() {
        cc.Component.EventHandler.emitEvents(this.OnTestStateStateMachineInit, this);
        if (this.start_fsm) this.startfsm();
    },


    //------------TestState<statemachine>------------//

    // initComp() {
    //     cc.TestState.bindTargetActions(this);
    // },
    // onDestroy() {
    //    if(cc.TestState) cc.TestState.removeTargetActions(this);
    // },
    // OnTestStateStateMachineInit(TestState) {
    //     // this.teststatestatemachine = TestState;
    //     this.teststatefsm = TestState.fsm;
    // },


    // onEnterNone(fsm, name, from, to, args) {
    //    //cc.TestState.fsm.to_step1(); //第一步
    // },

    // // 第一步
    // onEnterStep1(fsm, name, from, to, args) {
    //    //cc.TestState.fsm.to_step2(); //第二步
    // },

    // // 第二步
    // onEnterStep2(fsm, name, from, to, args) {
    // },

});
