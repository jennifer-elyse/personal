console.clear();
const modalClose = document.querySelector('.modal__close');
const modalCard = document.querySelector('.modal');

getDeveloper();

function showContent(skill) {
	const laptopLogo = document.querySelector('.' + skill.id + '-logo');
	const contentLogo = document.querySelector('.modal__logo-content');
	const modalBody = document.querySelector('.modal__body');
	modalBody.innerHTML = skill.description;
	contentLogo.innerHTML = '';
	let logoImg = document.createElement('img');
	logoImg.src = laptopLogo.src;
	logoImg.setAttribute('height', '200px');
	logoImg.setAttribute('width', '200px');
	contentLogo.appendChild(logoImg);
	showModal();
}

modalClose.onclick = function() {
	hideModal();
}

function hideModal() {
	modalCard.classList.remove('active');
}

function showModal() {
	modalCard.classList.add('active');
}

function getDeveloper() {
	let endpoint = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/1116997/skillz.json";

	fetch(endpoint)
		.then(function (response) {
				console.log(response);
				return response.json();
		})
		.then(function (json) {
			console.log(json);
			const laptopNode = document.querySelector('.laptop');
			const skillz = json.skill;
		  skillz.forEach(skill => {
				const skillNode = document.createElement('div');
				let skillId = skill.id;
				skillNode.setAttribute('class', 'logo-container logo-container--' + skillId);
				skillNode.onclick = function () {
					showContent(skill);
				}
				let skillImg = document.createElement('img');
				skillImg.setAttribute('src', skill.imgSrc);
				skillImg.setAttribute('alt', skill.imgAlt);
				skillImg.classList.add(skillId + '-logo');
				skillNode.appendChild(skillImg);
				laptopNode.appendChild(skillNode);
			});
		})
		.catch(function (error) {
				console.log('Error during fetch: ' + error.message);
		});
}