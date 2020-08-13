"use strict";
sap.ui.define([
	"sap/ui/test/Opa5",
	"./arrangements/Startup",
	"./WorklistJourney"
], function (Opa5, Startup) {

	Opa5.extendConfig({
		arrangements: new Startup(),
		viewNamespace: "zdigitalticket.view.",
		autoWait: true
	});
});
