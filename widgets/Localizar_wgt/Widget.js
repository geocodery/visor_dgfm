define(['dojo/_base/declare', 'jimu/BaseWidget'], function (declare, BaseWidget) {
  return declare([BaseWidget], {

    // Custom widget code goes here

    baseClass: 'localizar-wgt',

    postCreate: function postCreate() {
      this.inherited(arguments);
      console.log('Localizar_wgt::postCreate');
    }
  }
  // startup() {
  //   this.inherited(arguments);
  //   console.log('Localizar_wgt::startup');
  // },
  // onOpen() {
  //   console.log('Localizar_wgt::onOpen');
  // },
  // onClose(){
  //   console.log('Localizar_wgt::onClose');
  // },
  // onMinimize(){
  //   console.log('Localizar_wgt::onMinimize');
  // },
  // onMaximize(){
  //   console.log('Localizar_wgt::onMaximize');
  // },
  // onSignIn(credential){
  //   console.log('Localizar_wgt::onSignIn', credential);
  // },
  // onSignOut(){
  //   console.log('Localizar_wgt::onSignOut');
  // }
  // onPositionChange(){
  //   console.log('Localizar_wgt::onPositionChange');
  // },
  // resize(){
  //   console.log('Localizar_wgt::resize');
  // }
  );
});
//# sourceMappingURL=Widget.js.map
