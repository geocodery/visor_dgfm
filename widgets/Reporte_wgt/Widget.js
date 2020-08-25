define(['dojo/_base/declare', 'jimu/BaseWidget'], function (declare, BaseWidget) {
  return declare([BaseWidget], {

    // Custom widget code goes here

    baseClass: 'reporte-wgt',

    postCreate: function postCreate() {
      this.inherited(arguments);
      console.log('Reporte_wgt::postCreate');
    }
  }
  // startup() {
  //   this.inherited(arguments);
  //   console.log('Reporte_wgt::startup');
  // },
  // onOpen() {
  //   console.log('Reporte_wgt::onOpen');
  // },
  // onClose(){
  //   console.log('Reporte_wgt::onClose');
  // },
  // onMinimize(){
  //   console.log('Reporte_wgt::onMinimize');
  // },
  // onMaximize(){
  //   console.log('Reporte_wgt::onMaximize');
  // },
  // onSignIn(credential){
  //   console.log('Reporte_wgt::onSignIn', credential);
  // },
  // onSignOut(){
  //   console.log('Reporte_wgt::onSignOut');
  // }
  // onPositionChange(){
  //   console.log('Reporte_wgt::onPositionChange');
  // },
  // resize(){
  //   console.log('Reporte_wgt::resize');
  // }
  );
});
//# sourceMappingURL=Widget.js.map
