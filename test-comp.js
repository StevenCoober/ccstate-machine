cc.Class({
	extends: cc.Component,

    properties: {
    	TestStateNode: cc.Node
	},

	onLoad() {
		let TestStateComp = this.TestStateNode.getComponent("TestState");
		TestStateComp.bindTargetActions(this);

		this.teststatefsm = TestStateComp.fsm;
	},

	// 第一步
    onEnterStep1(fsm, name, from, to, args) {
       //fsm.to_step2(); //第二步
    },

    // 第二步
    onEnterStep2(fsm, name, from, to, args) {
    },

});
