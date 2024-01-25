window.onload = () => {
  // csrf
  fetch("/api/auth/csrf")
    .then((res) => res.json())
    .then((data) => {
      const csrfItems = document.getElementsByClassName("csrf");
      const token = data.csrfToken;
      for (const item of csrfItems) {
        item.setAttribute("value", token);
      }
    })
    .catch((err) => {
      console.log(err);
    });

  const forms = document.querySelectorAll(".reset-form");
  for (const form of forms) {
    form.addEventListener("submit", (e) => {
      form.reset();
    });
  }
};
