$(document).ready(function() {
	var currentRoom = "";
	var allUsers = [];
	var currentWordID = "";
	var currentWordOwner = "";
	var currentStatus = ""; 
	var me = ""; //current user
	var selectedDefinition=false;
	var voted = false;
	//room and user handling
	if(getUrlVars()["kamer"] && getUrlVars()["kamer"].length > 15){
		currentRoom=getUrlVars()["kamer"];

		//listen to room updates
		db.collection("rooms").doc(currentRoom)
		.onSnapshot(function(snap) {
	        if(snap.exists){
		        //create a user if they have none
		        $("#roomname").text(snap.data().roomname);
		   		$("#ronde").text("Ronde "+snap.data().huidigWoord);
		   		$("#toevoegen span").text(snap.data().shortroom);
		   	}else{
		   		alert("room does not exist, redirect");
		   		window.location.href = "index.html";
		   	}
	    },function(error) {
			handleError(error);
		});

		if(localStorage.getItem("WBS-"+getUrlVars()["kamer"])){
			//perhaps valid room, loged in
			me = localStorage.getItem("WBS-"+getUrlVars()["kamer"]);
		}else{
			alert("username not found, redirect");
			window.location.href = "index.html";
		}
	}else{
		//no room given, redirect!
		window.location.href = "index.html";
	}	

	var randomTekstje=[
		"Wow zo realistisch!",
		"Goed gevonden!",
		"Dit is eigenlijk het omgekeerde van de mol maar dan met woorden. Ofzoiets",
		"Als dat geen punten opleverd weet ik het ook niet meer...",
		"Kanshebber voor de originaliteitsprijs!",
		"Oei daar stond wel een spellingsfoutje in precies... Neenee mopje",
		"Niet slecht, maar ook ni top.",
		"Dit moet wel de beste zijn!",
		"Zeg 3 keer het woord 'banaan' als je dit leest.",
		"Super goed gedaan, wow!",
		"Hierna nog een rondje?",
		"*BIEP BIEP BLIEP BLOP BEDANKT*",
		"So no one told you life was gonna be this way"
	];

	//listener
	var wordsListener;

	//listen to all user updates & scores and shit	
	db.collection("rooms").doc(currentRoom)
	.collection("users").orderBy("createdDate","desc").where("allowed","==",true)
	.onSnapshot(function(snap) {
    	var userHtml="";
    	allUsers=[];
        snap.forEach(function(doc) {
        	allUsers[doc.id]={
        		"username":doc.data().username,
        		"punten":doc.data().punten,
        	};
        	userHtml+=`<div class="${currentWordOwner==doc.id ? "wordOwner":""}" data-userid="${doc.id}" title="${doc.data().username}">
                        <h3>${doc.data().username} ${doc.id == me ?" (jezelf)":''}</h3><h4 class="text-muted score">${doc.data().punten}</h4>
                        <div class="checkmark"><svg class="bi bi-check-circle" width="1.5em" height="1.5em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L8 9.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"></path><path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1013.5 8a.5.5 0 011 0 6.5 6.5 0 11-3.25-5.63.5.5 0 11-.5.865A5.472 5.472 0 008 2.5z" clip-rule="evenodd"></path></svg></div>
                    </div>`;
        });
        $(".deelnemers").html(userHtml);
    },function(error) {
		handleError(error);
	});

	var submissionFunction;
    //listen to all words, select latest	
	db.collection("rooms").doc(currentRoom)
	.collection("woorden").orderBy("createdDate","desc").limit(1) //TODO: add create button if none is found
	.onSnapshot(function(snap) {
    	var userHtml="";
        snap.forEach(function(doc) {
       		var woorddata=doc.data();
       		//if it changed, listen to the current word

   			$(".deelnemers > div").removeClass('wordOwner');
   			$(".deelnemers > div[data-userid='"+woorddata.wordOwner+"']").addClass('wordOwner');
   			$(".deelnemers > .checkmark").hide();

   			currentWordID = doc.id;
   			currentWordOwner = woorddata.wordOwner;

   			//reset
   			if(currentStatus=="finishing" && woorddata.status=="new"){
   				$("#betekenisinput,#woordinput").val("");
   				selectedDefinition=false;
   			}

   			currentStatus=woorddata.status;
			woorddata.wordOwner == me ? $(".wordOwnerOnly").show() : $(".wordOwnerOnly").hide();



   			//handle status
	   		if(woorddata.status){

				if(submissionFunction instanceof Function){
        			submissionFunction();
        		}

	   			//NEW status
				if(woorddata.status == "new"){
					$(".mode").hide();
					if(woorddata.wordOwner == me){
   						$("#word,span.theword").text("Even geduld...");
						$("#woordinput").val("");
						$("#submitWoord").addClass('disabled');
						$(".mode[data-mode='enterWord']").show();
						
					}else{
   						$("#word,span.theword").text("Even geduld...");
						$(".mode[data-mode='wachten']").show();	
					}

				//WRITING status
				}else if(woorddata.status == "writing"){
   					$("#word,span.theword").text(woorddata.woord);
					$(".mode").hide();
					$(".mode[data-mode='enterBetekenis']").show();

					submissionFunction = db.collection("rooms").doc(currentRoom)
					.collection("woorden").doc(doc.id).collection("submissions").orderBy("randomOrder","desc")
					.onSnapshot(function(submissions) {
				        submissions.forEach(function(submission) {
				    		$(".deelnemers > div[data-userid='"+submission.id+"'] > div.checkmark").show();
				       	});

				    },function(error) {
						handleError(error);
					});


				//PICKING status
				}else if(woorddata.status == "picking"){
   					$("#word,span.theword").text(woorddata.woord);
					$(".mode").hide();
					$(".mode[data-mode='displayWords']").show();
					$("#selectBetekenis").addClass('disabled');
					$("#wordExplanation").text("");
					$("#nextRound").hide();
					
					//get all words -> for voting round
		       		submissionFunction = db.collection("rooms").doc(currentRoom)
					.collection("woorden").doc(doc.id).collection("submissions").orderBy("randomOrder","desc")
					.onSnapshot(function(submissions) {
				    	var wordHtml="";
				    	voted=false;
				        submissions.forEach(function(submission) {
				    		var data=submission.data();
				    		if(data.voted && data.voted.includes(me)){
				    			voted = true;
				    		}

				    		//if user already voted, hide button
							voted || woorddata.wordOwner == me ? $("#selectBetekenis").hide() : $("#selectBetekenis").show();

				       		wordHtml+=`<li class="${selectedDefinition == submission.id ? "selected": ""}" data-definitionid="${submission.id}">${data.uitleg} ${submission.id==me?" (Jouw definitie)":""} `;
		       				if(data.voted){
					       		if(data.voted.length == 1){
									wordHtml+=`<span class="badge badge-primary"> (1 Stem)</span>`;
					       		}else if(data.voted.length > 1){
									wordHtml+=`<span class="badge badge-primary">(${data.voted.length} Stemmen)</span>`;
					       		}
					       	}
				       		wordHtml+=`</li>`;
				       	});

				       	$("#wordExplanation").html(wordHtml);

				       	if(woorddata.wordOwner != me || voted!=true){
					       	$("#wordExplanation > li").click(function(event) {
						    	event.preventDefault();
						    	$("#wordExplanation > li").removeClass('selected');
						    	selectedDefinition = $(this).attr("data-definitionid");
						    	if(selectedDefinition!=me && currentWordOwner != me){
						    		$(this).addClass('selected');
						    		$("#selectBetekenis").removeClass('disabled');
						    	}else{
									selectedDefinition=false;
						    		$("#selectBetekenis").addClass('disabled');
						    	}
						    });
					    }
				    },function(error) {
						handleError(error);
					});

				//FINISHING status
				}else if(doc.data().status == "finishing"){
   					$("#word,span.theword").text(doc.data().woord);
					$(".mode").hide();
					$(".mode[data-mode='displayWords']").show();
					$("#selectBetekenis").hide();
					$(".bottomText").hide();
					$("#wordExplanation").text("");

					submissionFunction = db.collection("rooms").doc(currentRoom)
					.collection("woorden").doc(doc.id).collection("submissions").orderBy("randomOrder","desc")
					.onSnapshot(function(submissions) {
				    	var wordHtml = "";
				        submissions.forEach(function(submission) {
				    		var data = submission.data();
				       		wordHtml += `<li class="${data.realDefinition ? "correct": ""}" data-definitionid="${submission.id}">${data.uitleg} `;
		       				if(data.voted){
					       		if(data.voted.length == 1){
									wordHtml += `<span class="badge badge-primary"> (1 Stem)</span>`;
					       		}else if(data.voted.length > 1){
									wordHtml += `<span class="badge badge-primary">(${data.voted.length} Stemmen)</span>`;
					       		}
					       	}
					       	wordHtml += `<span class="text-muted">Door ${allUsers[submission.id].username}</span>`;
				       		wordHtml += `</li>`;
				       	});

				       	$("#wordExplanation").html(wordHtml);
				       	if(woorddata.wordOwner == me) $("#nextRound").show();
				    },function(error) {
						handleError(error);
					});
				}
	       	}
        });

    },function(error) {
		handleError(error);
	});

    function init(){
    	$('[data-toggle="tooltip"]').tooltip({
    		trigger:"hover"
    	});
 		
 		//general listeners
	    $(document).on('keyup', '#betekenisinput', function(event) {
	    	event.preventDefault();
	    	 if($(this).val().length !=0)
	            $('#submitBetekenis').removeClass('disabled');            
	        else
	            $('#submitBetekenis').addClass('disabled');

	    }).on('click', '#submitBetekenis', function(event) {
	    	event.preventDefault();
	    	if(!$(this).hasClass('disabled') && $("#betekenisinput").val().length !=0){
				if(currentWordID!="" && currentStatus=="writing"){
					loading("#submitBetekenis");
					//submit woord!
					db.collection("rooms").doc(currentRoom)
					.collection("woorden").doc(currentWordID)
					.collection("submissions").doc(me).set({
						realDefinition: currentWordOwner == me ? true : false,
						uitleg: $("#betekenisinput").val(),
						randomOrder: Math.random()
					}).then(function(docRef){
						$(".mode").hide();						
						$(".mode[data-mode='afterSubmit'] > p:first-of-type").text(randomTekstje[Math.floor(Math.random()*randomTekstje.length)]);
						$(".mode[data-mode='afterSubmit']").show(300);
						$("#submitBetekenis").text("Stuur op!");
						$
					}).catch(function(error) {
						handleError(error);
						$("#submitBetekenis").text("Stuur op!");
					});
				}
	    	}
	    }).on('keyup', '#woordinput', function(event) {
	    	event.preventDefault();
	    	if($(this).val().length !=0)
	            $('#submitWoord').removeClass('disabled');            
	        else
	            $('#submitWoord').addClass('disabled');

	    }).on('click', '#submitWoord', function(event) {
	    	event.preventDefault();
	    	if(!$(this).hasClass('disabled') && $("#woordinput").val().length !=0){
	    		if(currentWordID!="" && currentStatus=="new"){
					//submit woord!
					db.collection("rooms").doc(currentRoom)
					.collection("woorden").doc(currentWordID)
					.update({
						status: "writing",
						woord: $("#woordinput").val()
					}).catch(function(error) {
						handleError(error);
					});
				}
				resetFields();
	    	}
	    }).on('click', '#resetWord > a', function(event) {
	    	event.preventDefault();
	    	if(currentWordID!=""){
				//submit woord!
				db.collection("rooms").doc(currentRoom)
				.collection("woorden").doc(currentWordID)
				.update({
					status: "new",
					woord: ""
				}).catch(function(error) {
					handleError(error);
				});
			}
	    }).on('click', '#toPickingRound', function(event) {
	    	event.preventDefault();
	    	if(currentWordOwner==me && currentStatus=="writing"){
	    		//van writing naar picking ronde
				db.collection("rooms").doc(currentRoom)
				.collection("woorden").doc(currentWordID)
				.update({
					status: "picking"
				}).catch(function(error) {
					handleError(error);
				});
			}
	    }).on('click', '#nextStatus', function(event) {
	    	event.preventDefault();
	    	if(currentWordOwner==me && currentStatus=="picking"){
	    		//van writing naar picking ronde
				db.collection("rooms").doc(currentRoom)
				.collection("woorden").doc(currentWordID)
				.update({
					status: "finishing"
				}).catch(function(error) {
					handleError(error);
				});
			}
	    }).on('click', '#selectBetekenis', function(event) {
	    	event.preventDefault();
	    	if(currentStatus=="picking" && selectedDefinition!=me){
	    		if(selectedDefinition != false){
					db.collection("rooms").doc(currentRoom)
					.collection("woorden").doc(currentWordID)
					.collection("submissions").doc(selectedDefinition)
					.update({
						voted: firebase.firestore.FieldValue.arrayUnion(me)
					}).catch(function(error) {
						handleError(error);
					});
				}
			}
	    }).on('click', '.deelnemers > div', function(event) {
	    	event.preventDefault();
    		var selectedDeelnemer = $(this).attr("data-userid");
	    	if(currentStatus=="finishing" && currentWordOwner==me && selectedDeelnemer!=me){
	    		db.collection("rooms").doc(currentRoom)
				.collection("woorden").add({
					createdDate: new Date,
					status: "new",
					woord: "",
					wordOwner: selectedDeelnemer
				}).catch(function(error) {
					handleError(error);
				});
	    	}
	    });

    }
    init();
	   
    console.log("user: "+me);

    function loading(selector){
    	$(selector).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
    }

    function handleError(error){
    	console.log(error);
    }

	//call when a user has sent a word
    function resetFields(){
    	$(".form-control").val("");
    }
	function getUrlVars() {
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
		});
		return vars;
	}
});