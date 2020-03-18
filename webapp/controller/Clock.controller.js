sap.ui.define(
	[
		"zdigitalticket/controller/BaseController",
		"zui5controlstmb/utils/Analytics",
		"zui5controlstmb/utils/CommonUtils",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator"
	],
	function (BaseController, Analytics, CommonUtils, Filter, FilterOperator) {
		"use strict";

		return BaseController.extend("zdigitalticket.controller.Clock", {
			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */
			onInit: function() {
				var sFunctionName = "onInit";

				try {
					this._handleAnalyticsSendEvent(sFunctionName, Analytics.FUNCTION_TYPE.LIFECYCLE);
					BaseController.prototype.onInit.call(this);
					this.getRouter().getRoute("RouteClock").attachPatternMatched(this.onClockMatched, this);
				}
				catch (oError) {
					this._handleCatchException(oError, sFunctionName);
				}
			},
			
			/* =========================================================== */
			/* event handlers                       					   */
			/* =========================================================== */
			onPressConfirmActivity: function(oEvent){
				var that = this;
				var sFunctionName = "onPressConfirmActivity";
				try {
					this._handleAnalyticsSendEvent(sFunctionName, Analytics.FUNCTION_TYPE.EVENT);
					var sEmpId = this.getView().getModel("localBinding").getProperty("/EmployeeId");	
					if(!sEmpId){
						sEmpId = sap.ushell.Container.getService("UserInfo").getId();
					}
					that.getView().getModel().callFunction("/SetActivityConfirmation", {
						method: "GET",
						urlParameters: {
							"EmployeeId": sEmpId
						},
						success: function (oResponse) {
							var sResponseMsg = oResponse.SetActivityConfirmation.res_message;
							if(oResponse.SetActivityConfirmation.is_confirmed){
								that._changeBtnStatus(true);
							}else if(sResponseMsg!=undefined && sResponseMsg.length>0){
								that.showErrorMessageBox(sResponseMsg);
							} 
						},
						error: function (oError) {
							var oView = that.getView();
							var sText = "";
							try{
								var objResponse = JSON.parse(oError.responseText);
								sText = objResponse.error.message.value;
							} catch(oErrInner){
								sText = oView.getModel("i18n").getResourceBundle().getText("Clock.button.errorConfirmingActivity");
							}
							that.showErrorMessageBox(sText);
						}
					});
				} catch (oError) {
					this._handleCatchException(oError, sFunctionName);
				}
			},
			
			onClockMatched: function(oEvent){
				var sFunctionName = "onTEInfoMatched";
				try {
					this._handleAnalyticsSendEvent(sFunctionName, Analytics.FUNCTION_TYPE.EVENT);
					var oView = this.getView();
					var oModelLocalBinding = oView.getModel("localBinding");
					
					//Inicializamos la propiedad raiz de la pantalla en el modelo localbinding.
					oModelLocalBinding.setProperty("/Clock", []);
					
					if( oModelLocalBinding.getProperty("/Line") === undefined ){
						//Se pasa por parámetros la función callback para recuperar la información de la actividad diaria.
						this._getTicketData(this.getActivityData);
					}else{
						//Si la propiedad Line está informada quiere decir que ya se ha recuperado la información del 
						//empleado en otra llamada. Así que para obtener una carga más rapida, se llama directamente a
						//la función que recuperará la información de la actividad diraria 
						this.getActivityData();
					}
					
				} catch (oError) {
					this._handleCatchException(oError, sFunctionName);
				}
			},
			
			/* =========================================================== */
			/* formatters and other public methods                         */
			/* =========================================================== */
			formtterConfirmActivity: function(aActivity){
				var oView = this.getView();
				var oConfirmBtn = oView.byId("confirmActivityBtn");
				
				oConfirmBtn.setType(sap.m.ButtonType.Negative);
				var sText = oView.getModel("i18n").getResourceBundle().getText("Clock.button.confirmActivity");
				oConfirmBtn.setEnabled(true);
				
				if(aActivity && aActivity.length>0){
					var iItemsApproved = 0;
					aActivity.forEach(function(oActivity){ 
						if(oActivity.IsApproved === "X"){
							iItemsApproved++;
						}
					});
					if(iItemsApproved === aActivity.length){
						sText = oView.getModel("i18n").getResourceBundle().getText("Clock.button.activityConfirmed");
						oConfirmBtn.setType(sap.m.ButtonType.Accept);
						oConfirmBtn.setEnabled(false);
					}
				}else{
					sText = oView.getModel("i18n").getResourceBundle().getText("Clock.button.activityNoData");	
					oConfirmBtn.setEnabled(false);
				}
				
				var isAdmin = oView.getModel("appView").getProperty("/isAdmin");
				if(isAdmin){
					oConfirmBtn.setEnabled(false);
				}
				
				return sText;
			},
			
			/* =========================================================== */
			/* private methods                                             */
			/* =========================================================== */
			//Función que ejecuta la llamada al oData para recuperar las actividades del empleado.
			getActivityData: function(){
				var sFunctionName = "getActivityData";
				var oModel = this.getView().getModel();
				var oModelLocalBinding = this.getView().getModel("localBinding");
				var that = this;
				try {
					this._handleAnalyticsSendEvent(sFunctionName, Analytics.FUNCTION_TYPE.EVENT);
					
					var aFilters = [];
					var oDate = oModelLocalBinding.getProperty("/Date");
					var oDateUTC = CommonUtils.convertDateToUTC( oDate );
					aFilters.push(
						new Filter({
							path: "Date",
							operator: FilterOperator.EQ,
							value1: oDateUTC
						})
					);
	
					var sEmpId = oModelLocalBinding.getProperty("/EmployeeId");	
					if(!sEmpId){
						sEmpId = sap.ushell.Container.getService("UserInfo").getId().substr(0, 10);
					}
					if(sEmpId){
						aFilters.push(
							new Filter({
								path: "Employeenumber",
								operator: FilterOperator.EQ,
								value1: sEmpId
							})
						);
					}
					var sAssignationGroupId = oModelLocalBinding.getProperty("/AssignationGroupId");
					if(sAssignationGroupId){
						aFilters.push(
							new Filter({
								path: "AssignationGroupId",
								operator: FilterOperator.EQ,
								value1: sAssignationGroupId
							})
						);
					}
				
					this.handleBusy(true);
					oModel.read("/ActivitySet", {
	                	filters: aFilters,
		                success: (function(oResponse) {
	                		var oView = that.getView();
	                		oView.getModel("localBinding").setProperty("/Clock/ActivitySet", oResponse.results);
							that.handleBusy(false);
		                }),
		                error: (function(oResponse) {
	                		var oView = that.getView();
							oView.getModel("localBinding").setProperty("/Clock/ActivitySet", []);
							var sText = oView.getModel("i18n").getResourceBundle().getText("error.loading.data");
							that.showErrorMessageBox(sText);
							that.handleBusy(false);
		                })
		            });
				} catch (oError) {
					this._handleCatchException(oError, sFunctionName);
				}
			},
			
			_changeBtnStatus: function(bConfirm){
				var sFunctionName = "_changeBtnStatus";
				var oView = this.getView();
				var sText, sType;
				var oConfirmBtn = oView.byId("confirmActivityBtn");
				try {
					if(bConfirm){
						sText = oView.getModel("i18n").getResourceBundle().getText("Clock.button.activityConfirmed");
						sType = "Accept";
						oConfirmBtn.setEnabled(false);
					}else{
						sText = oView.getModel("i18n").getResourceBundle().getText("Clock.button.confirmActivity");
						sType = "Negative";
					}
					oConfirmBtn.setText(sText);
					oConfirmBtn.setType(sType);
				} catch (oError) {
					this._handleCatchException(oError, sFunctionName);
				}
				return sText;
			}
		});
	}
);
