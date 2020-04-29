const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.changeStatus = functions.region('europe-west1').firestore
    .document("rooms/{roomID}/woorden/{woordID}") //when a task is changed
    .onUpdate((change, context) => {
            const wordBefore = change.before.data();
            const wordAfter = change.after.data();

            // when a game needs calculations
            if (wordBefore.status == "picking" && wordAfter.status == "finishing") {
                var batch = db.batch(); //make batch edits

                //----- 3 steps of calculations -----
                var realHasvotes = 0;
                return db.collection('rooms').doc("" + context.params.roomID)
                    .collection('woorden').doc("" + context.params.woordID)
                    .collection("submissions").get().then(snapshot => {
                        snapshot.forEach(submission => {
                            var hasvotes = 0;
                            if (submission.data().voted) {
                                submission.data().voted.map((vote) => {
                                    // 1: +1 per person if word is correct
                                    if (submission.data().realDefinition == true) {
                                        batch.update(db.collection('rooms').doc("" + context.params.roomID)
                                            .collection('users').doc("" + vote), { punten: admin.firestore.FieldValue.increment(1) });
                                        console.log("1) Given 1 to: " + vote);
                                        realHasvotes++;
                                    }
                                    hasvotes++;
                                });
                            };

                            // 2: +1 per person if your word is guessed
                            if (hasvotes != 0 && submission.data().realDefinition == false) {
                                batch.update(db.collection('rooms').doc("" + context.params.roomID)
                                    .collection('users').doc("" + submission.id), { punten: admin.firestore.FieldValue.increment(hasvotes) })

                                console.log("2) Given " + hasvotes + " to: " + submission.id);
                            }

                        })
	                }).then(then=>{
                        if (realHasvotes == 0) {
                            // 3: +2 if nobody guessed your word
                            batch.update(db.collection('rooms').doc("" + context.params.roomID)
                                .collection('users').doc("" + wordAfter.wordOwner), { punten: admin.firestore.FieldValue.increment(2) })

                            console.log("3) Given 2 to: " + wordAfter.wordOwner);
                        }

                        batch.update(db.collection('rooms').doc("" + context.params.roomID), {huidigWoord: admin.firestore.FieldValue.increment(1)});

                    	batch.commit().then(function() {
		                    console.log("Commit success!");
		                }).catch(function(error) {
		                    console.log("Transaction failed: ", error);
		                });
	                })
                  

                
            }else {
			    return true;
			}
		console.log("Serverstatus changed: " + context.params.roomID);

});