G.LoginUI = (() => {
  const $ = (id) => G.UI.$(id),
    T = (es, en, zh) => G.Server.text(es, en, zh);
  let mode = "login",
    recovery = null;
  function init() {
    document.querySelectorAll("#scr-login .tab").forEach((t) => {
      t.onclick = () => setMode(t.dataset.tab);
    });
    $("login-form").onsubmit = async (e) => {
      e.preventDefault();
      $("login-err").textContent = "";
      $("btn-auth").disabled = true;
      const r = await (mode === "login" ? G.DB.login : G.DB.register)(
        $("f-user").value,
        $("f-pass").value,
      );
      $("btn-auth").disabled = false;
      if (!r.ok) {
        $("login-err").textContent = r.error;
        return;
      }
      $("f-pass").value = "";
      if (r.recovery) {
        recovery = r.recovery;
        showCode();
      } else G.Flow.afterLogin();
    };
    $("btn-guest").onclick = () => {
      G.DB.playAsGuest();
      G.Flow.afterLogin();
    };
    $("f-forgot").onclick = (e) => {
      e.preventDefault();
      $("forgot-note").classList.toggle("hidden");
    };
    $("rec-link").onclick = () => {
      recovery = null;
      G.UI.hide("scr-recover");
      G.Flow.afterLogin();
    };
    $("rec-later").classList.add("hidden");
    $("rec-never").closest("p").classList.add("hidden");
    $("login-form").insertAdjacentElement("afterend", $("forgot-note"));
    const form = document.createElement("form");
    form.id = "self-recovery";
    for (const [id, type, placeholder] of [
      ["recovery-name", "text", T("Usuario", "Username", "用户名")],
      [
        "recovery-code",
        "text",
        T("Código de recuperación", "Recovery code", "恢复码"),
      ],
      [
        "recovery-pass",
        "password",
        T(
          "Contraseña nueva (8–128)",
          "New password (8–128)",
          "新密码（8～128 位）",
        ),
      ],
    ]) {
      const i = document.createElement("input");
      i.id = id;
      i.type = type;
      i.className = "field";
      i.placeholder = placeholder;
      i.required = true;
      i.autocomplete = type === "password" ? "new-password" : "off";
      form.appendChild(i);
    }
    const submit = document.createElement("button");
    submit.className = "btn";
    submit.textContent = T("Recuperar cuenta", "Recover account", "找回账号");
    form.appendChild(submit);
    $("forgot-note").replaceChildren(form);
    form.onsubmit = async (e) => {
      e.preventDefault();
      submit.disabled = true;
      try {
        const r = await G.Server.api("/recover", {
          name: $("recovery-name").value,
          recovery: $("recovery-code").value,
          pass: $("recovery-pass").value,
        });
        $("recovery-pass").value = "";
        $("recovery-code").value = "";
        $("forgot-note").classList.add("hidden");
        const note = document.createElement("p");
        note.setAttribute("translate", "no");
        note.textContent =
          T(
            "Nuevo código (guárdalo): ",
            "New recovery code (save it): ",
            "请保存新的恢复码：",
          ) + r.recovery;
        $("login-err").replaceChildren(note);
      } catch (e) {
        $("login-err").textContent = e.message;
      } finally {
        submit.disabled = false;
      }
    };
  }
  function showCode() {
    const box = $("scr-recover");
    box.querySelector("h2").textContent = T(
      "Guarda tu código",
      "Save your recovery code",
      "请保存账号恢复码",
    );
    box.querySelector("p").textContent = T(
      "Es la única forma de recuperar tu contraseña. Se muestra una sola vez.",
      "This is your password recovery method. Shown only once.",
      "恢复码用于重置密码，只显示这一次。请妥善保存，不要分享给他人。",
    );
    $("rec-err").textContent = recovery;
    $("rec-err").setAttribute("translate", "no");
    $("rec-err").style.overflowWrap = "anywhere";
    $("rec-link").textContent = T(
      "Guardado, continuar",
      "Saved, continue",
      "已保存，继续",
    );
    G.UI.show("scr-recover", true);
  }
  function setMode(m) {
    mode = m;
    document
      .querySelectorAll("#scr-login .tab")
      .forEach((t) => t.classList.toggle("on", t.dataset.tab === m));
    $("btn-auth").textContent = m === "login" ? "Entrar" : "Crear cuenta";
    $("f-pass").autocomplete =
      m === "login" ? "current-password" : "new-password";
    $("f-pass").minLength = G.DB.mode === "server" ? 8 : 4;
    $("login-err").textContent = "";
  }
  function open() {
    G.UI.chrome(false);
    G.UI.show("scr-login");
    $("signup-closed").classList.add("hidden");
    $("login-mode").textContent =
      G.DB.mode === "server"
        ? T(
            "Cuenta propia: guardado en el servidor, sin Google.",
            "Private account system: server saves, no Google.",
            "自建账号系统：存档保存在自己的服务器，无需绑定 Google。",
          )
        : T(
            "Modo local: sólo este navegador.",
            "Local mode: this browser only.",
            "本地模式：账号与存档仅保存在当前浏览器。",
          );
    setTimeout(() => $("f-user").focus(), 50);
  }
  return { init, open, offerRecovery() {} };
})();
