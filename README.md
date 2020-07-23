用法
* 导入state-machine
* 安装staruml 5.0
* 新建uml文件
** 初始状态名称必须为 none
* 点击ccstate-machine 生成文件
* 拖入生成脚本到编辑器
* 使用
```js
cc.Class({
	extends: cc.Component,

    properties: {
    	TestStateNode: cc.Node
	},

	onLoad() {
		let TestStateComp = this.TestStateNode.getComponent("TestState");
		TestStateNode.bindTargetActions(this);

		this.teststatefsm = TestStateComp.fsm;
	},

	// 第一步
    onEnterStep1(fsm, name, from, to, args) {
       //cc.TestState.fsm.to_step2(); //第二步
    },

    // 第二步
    onEnterStep2(fsm, name, from, to, args) {
    },

});

```
