const functions = require('firebase-functions');

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.changeStatus = functions.region('europe-west1').firestore
.document("rooms/{roomID}/") //when a task is changed
.onWrite((change,context)=>{
	const roomBefore= change.before.data();
	const roomAfter= change.after.data();

	// when a game needs calculations
	if(roomBefore.serverstatus=="game" && roomAfter.serverstatus=="score"){
		console.log("Serverstatus changed: "+context.params.roomID);
	}
});