Notyf.prototype.confirm = function(options) {
  const notyf = this;
  const {
    message,
    buttons
  } = options;

  const notyfConfirm = notyf.open({
    type: 'confirm',
    message,
    ...options
  });

  const buttonsContainer = notyfConfirm.node.querySelector('.notyf__buttons');
  if (!buttonsContainer) {
    const container = document.createElement('div');
    container.className = 'notyf__buttons';
    notyfConfirm.node.appendChild(container);
  }

  buttons.forEach(buttonOptions => {
    const button = document.createElement(buttonOptions.tagName || 'button');
    button.className = buttonOptions.className;
    button.textContent = buttonOptions.text;
    button.onclick = () => buttonOptions.onClick({
      close: () => notyf.dismiss(notyfConfirm)
    });
    notyfConfirm.node.querySelector('.notyf__buttons').appendChild(button);
  });

  return notyfConfirm;
};