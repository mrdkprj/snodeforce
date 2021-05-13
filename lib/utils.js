export function Http(){

    this.request = async function (url = "", data = {}, progress = true){

        if(progress){
            showProgress();
        }

        data.username = document.getElementById("username").textContent;

        try{
            const response = await fetch(url, {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify(data)
            });

            const json = await response.json();

            if(response.ok)
                return json;

            throw new Error(json.error);

        }finally{

            if(progress){
                hideProgress();
            }
        }

    }
}

export function Message(area){

    this.display = function(message){
        const messageArea = document.getElementById(area).querySelector(".message");
        messageArea.textContent = message;
        messageArea.style.display = "block";
    };

    this.hide = function(){
        const messageArea = document.getElementById(area).querySelector(".message");
        messageArea.textContent = "";
        messageArea.style.display = "none";
    };
}

function showProgress() {
    document.getElementById("progress-line").classList.add("progress-line");
    document.getElementById("progress").style["visibility"] = "visible";
}

function hideProgress() {
    document.getElementById("progress-line").classList.remove("progress-line");
    document.getElementById("progress").style["visibility"] = "hidden";
}

