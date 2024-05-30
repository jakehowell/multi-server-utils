let servers = {};
window.activeTab = window.submitText = 'search';

// Methods
const showModal = (title, message) => {
    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal');
    const modalTitle = document.querySelector('.modal .modal-title');
    const modalMessage = document.querySelector('.modal .modal-body');
    modalTitle.innerHTML = title;
    modalMessage.innerHTML = message;
    modalOverlay.classList.add('active');
}

const hideModal = (event) => {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (event.target.classList.contains('modal-overlay') || event.target.classList.contains('modal-close')) {
        modalOverlay.classList.remove('active');
    }
}

const callApi = async (url, method, data) => {
    method = method || 'GET';
    const fetchOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
    }
    if (data) {
        fetchOptions.body = JSON.stringify(data);
    }
    return fetch(url, fetchOptions)
        .then(response => response.json())
        .then(output => {
            if (!output.ok) {
                console.error(output.errors.join(', '));
                throw new Error(output.errors.join('\n'));
            }

            return output.response;
        });
};

const switchChecks = (group, value) => {
    const type = group === 'all' ? 'input[type="checkbox"]' : `input[type="checkbox"][group="${group}"]`;
    document.querySelectorAll(`.environments ${type}`).forEach(element => {
        element.checked = value;
        if (element.checked) {
            element.setAttribute('checked', 'checked');
        } else {
            element.removeAttribute('checked');
        }
    });
}

const openTab = (event, tabName) => {
    event.preventDefault();
    const activeTab = event.target
    window.activeTab = window.submitText = activeTab.getAttribute('data-process');
    const activeContent = document.querySelector(`#${tabName}`);
    const tabContents = document.querySelectorAll('.process-tabs .tab-content');
    const tabs = document.querySelectorAll('.process-tabs .tab');
    const submit = document.querySelector('#execute');

    tabs.forEach(element => {
        element.classList.remove('active');
    });

    tabContents.forEach(element => {
        element.classList.remove('active');
    })

    activeTab.classList.add('active');
    activeContent.classList.add('active');

    submit.innerHTML = window.submitText;
}

const formatLogOutput = (input, search) => {
    let output = input;
    let meta = output.meta;
    if (search) {
        output = output.data.replaceAll(search, `<span class="search-highlight">${search}</span>`);
    }
    return output;
}

const formatCommandOutput = (input) => {
    let output = input.data;
    let meta = output.meta;
    return output;
}

const toggleOutput = (event) => {
    header = event.target.classList.contains('log-header') && event.target || false;
    const output = header.nextElementSibling;
    if (header) {
        if (output.classList.contains('collapsed')) {
            output.classList.remove('collapsed');
            header.classList.remove('collapsed');
        } else {
            output.classList.add('collapsed');
            header.classList.add('collapsed');
        }
    }
}

const downloadOutput = (event) => {
    window.open('/api/export', '_blank');
}

callApi('/api/getConfig')
    .then(response => response.data)
    .then(data => {
        const environments = document.querySelector('.environments');
        const beta = data.filter(server => server.env === 'beta');
        const prod = data.filter(server => server.env === 'production');
        servers = {
            beta,
            prod
        };
        [beta, prod].forEach(env => {
            const list = document.createElement('ul');
            list.classList.add('env-list');
            let envName = env[0]['env'];
            let li = document.createElement('li');
            let checkbox = document.createElement('input');
            let label = document.createElement('label');
            checkbox.type = 'checkbox';
            checkbox.name = 'environment';
            checkbox.value = checkbox.id = label.htmlFor = label.innerHTML = env[0]['env'];
            label.prepend(checkbox);
            li.classList.add('env-header');
            li.appendChild(label);
            list.appendChild(li);
            env.forEach(server => {
                let li = document.createElement('li');
                let checkbox = document.createElement('input');
                let label = document.createElement('label');
                checkbox.type = 'checkbox';
                checkbox.name = 'server';
                checkbox.setAttribute('group', `${env[0]['env']}`);
                checkbox.value = checkbox.id = label.htmlFor = label.innerHTML = server.name;
                label.prepend(checkbox);
                li.appendChild(label);
                list.appendChild(li);
            });
            environments.appendChild(list);
        });
    });

// Event Listeners
window.addEventListener('load', function () {
    const dlDialog = document.querySelector('.directory-listing-dialog');
    document.querySelectorAll('input[type="checkbox"][id="all"], input[type="checkbox"][name="environment"]').forEach(element => {
        element.addEventListener('change', (event) => {
            const group = event.target.getAttribute('value');
            if (event.target.checked) {
                switchChecks(group, true);
            } else {
                switchChecks(group, false);
            }
        });
    });
    document.querySelector('body').addEventListener('click', (event) => {
        if (dlDialog.classList.contains('active') && !event.target.closest('.directory-listing-dialog')) {
            closeDirectoryListingDialog(event);
        } else if(event.target.closest('.directory-listing-toggle')) {
            openDirectoryListingDialog(event);
        }
    });
    document.querySelector('.raw').addEventListener('click', toggleOutput);
    document.querySelector('#download').addEventListener('click', downloadOutput);
    document.querySelector('#execute').addEventListener('click', (event) => {
        event.preventDefault();
        const form = document.querySelector('form[id="process-form"]');
        const formData = new FormData(form);
        const submitButton = document.querySelector('#execute');
        let query = [];
        const loading = setLoading(true, document.querySelector('.output'), () => {
            submitButton.innerHTML = 'Working...';
            submitButton.setAttribute('disabled', 'disabled');
        });
        if (activeTab === 'search') {
            const queryObject = {
                logPath: formData.get('log-path'),
                logSearch: formData.get('log-search'),
                servers: formData.getAll('server').join(',')
            }
            Object.keys(queryObject).forEach(key => {
                if (queryObject[key] !== '') {
                    query.push(`${key}=${queryObject[key]}`);
                }
            });
            callApi(`/api/getLogs?${query.join('&')}`)
                .then(response => {
                    let rawOutput = document.querySelector('.output .raw');
                    rawOutput.innerHTML = formatLogOutput(response.data, queryObject.logSearch);
                })
                .catch(error => {
                    showModal('Error', error.message);
                })
                .finally(() => {
                    setLoading(false, loading, () => {
                        submitButton.innerHTML = window.submitText;
                        submitButton.removeAttribute('disabled');
                    });
                });
        }
        if (activeTab === 'run') {
            const queryObject = {
                servers: formData.getAll('server').join(',')
            }
            callApi(`/api/executeCommand?servers=${queryObject.servers}`, 'POST', { command: formData.get('command') })
                .then(data => {
                    let rawOutput = document.querySelector('.output .raw');
                    rawOutput.innerHTML = formatCommandOutput(data);
                })
                .catch(error => {
                    showModal('Error', error.message);
                })
                .finally(() => {
                    console.log('finally');
                    setLoading(false, loading, () => {
                        console.log(submitButton);
                        submitButton.innerHTML = window.submitText;
                        submitButton.removeAttribute('disabled');
                    });
                });
        }

    });
});

function setLoading(loading, element, cb, options) {
    const loader = document.querySelector('.loading');
    element.style.position = 'relative';
    if (loading) {
        let appended = element.appendChild(loader.cloneNode(false));
        appended.style.height = element.offsetHeight + 'px';
        appended.classList.add('active');
        cb && cb();
        return appended;
    } else {
        element.remove();
        cb && cb();
    }
}

document.querySelector('.history-toggle').addEventListener('click', (event) => {
    event.preventDefault();
    const modalBody = document.querySelector('.modal-body');
    const container = document.createElement('div');
    container.classList.add('history-container');
    const list = document.createElement('ul');
    list.classList.add('history-list');

    callApi('/api/getHistory')
        .then((data) => data.history)
        .then((data) => {
            if (data.length) {
                data.reverse();
                data.forEach((item) => {
                    let li = document.createElement('li');
                    let text = '';
                    console.log(item);
                    switch(item.endpoint) {
                        case 'getLogs':
                            text = `Search: ${item.params.logPath} ${item.params.logSearch}`;
                            break;
                        case 'executeCommand':
                            text = `Command: ${item.params.command}`;
                            break;
                        case 'getDirectory':
                            text = `Directory: ${item.params.directory}`;
                            break;
                        default:
                            text = `${item.endpoint}`;
                    }
                    li.innerHTML = text;
                    list.appendChild(li);
                });
                container.appendChild(list);
                showModal('History', '');
                modalBody.appendChild(container);
            } else {
                showModal('History', 'No history found.');
            }
        })
        .catch((error) => {
            showModal('Error', error.message);
        });
});

function getAbsoluteTop(element) {
    let top = element.offsetTop;
    let parent = element.offsetParent;
    while (parent.tagName !== 'BODY') {
        top += parent.offsetTop;
        parent = parent.offsetParent;
    }
    return top;
}

function getAbsoluteLeft(element) {
    let left = element.offsetLeft;
    let parent = element.offsetParent;
    while (parent.tagName !== 'BODY') {
        left += parent.offsetLeft;
        parent = parent.offsetParent;
    }
    return left;
}

function closeDirectoryListingDialog(event) {
    event.preventDefault();
    const dialog = document.querySelector('.directory-listing-dialog');
    dialog.classList.remove('active');
    dialog.removeAttribute('style');
}

function openDirectoryListingDialog(event) {
    event.preventDefault();
    const button = event.target;
    const dialogTop = getAbsoluteTop(button);
    const dialogLeft = getAbsoluteLeft(button);
    const dialog = document.querySelector('.directory-listing-dialog');
    dialog.style.top = `${dialogTop - 6}px`;
    dialog.style.left = `${dialogLeft + button.offsetWidth}px`;
    const server = servers.prod[0];
    dialog.classList.add('active');
    const loader = setLoading(true, dialog.querySelector('.modal-body'));
    getDirectoryListing(server)
        .finally(() => {
            setLoading(false, loader);
        });
}

async function cwdClickHandler(event) {
    const file = event.target.closest('li');
    const serverName = document.querySelector('.current-server').textContent;
    const path = document.querySelector('.current-directory').getAttribute('current-path');
    const fileName = file.querySelector('span.file-name').textContent;
    const loader = setLoading(true, document.querySelector('.directory-listing-dialog .modal-body'));
    if (file.getAttribute('type') === 'directory') {
        return getDirectoryListing({name: serverName}, `${path}/${fileName}`)
            .finally(() => {
                setLoading(false, loader);
            });
    }
    if (file.getAttribute('type') === 'file') {
        const fullPath = `${path}/${fileName}`;
        closeDirectoryListingDialog(event);
        return await callApi(`/api/executeCommand?servers=${serverName}`, 'POST', { command: `less ${fullPath}` })
            .then(data => {
                if (data) {
                    let rawOutput = document.querySelector('.output .raw');
                    rawOutput.innerHTML = formatCommandOutput(data);
                }
            })
            .finally(() => {
                setLoading(false, loader);
            });
    }
}

async function getDirectoryListing(server, directory = '/var/repsites') {
    const serverHeader = document.querySelector('.directory-listing-dialog .modal-header .current-server');
    const pathHeader = document.querySelector('.directory-listing-dialog .modal-body .current-directory');
    const filesList = document.querySelector('.directory-listing-dialog .modal-body .files');
    await callApi(`/api/getDirectory?server=${server.name}&directory=${directory}`)
        .then(data => {
            filesList.innerHTML = '';
            generateBreadcrumbs(server, data.meta.params.directory);

            // Add directory list
            const directories = data.files.filter(file => {
                return file.type === 'directory';
            }).sort((a,b) => a.name - b.name);

            const files = data.files.filter(file => {
                return file.type === 'file';
            }).sort((a,b) => a.name - b.name);

            const sorted = directories.concat(files);
            serverHeader.textContent = server.name;
            sorted.forEach((file) => {
                let li = document.createElement('li');
                let icon = document.createElement('span');
                let name = document.createElement('span');
                let iconClass = file.type === 'directory' ? 'file-type-directory' : 'file-type-file';
                li.setAttribute('type', file.type);
                icon.classList.add(iconClass);
                name.classList.add('file-name');
                name.innerHTML = file.name;
                li.appendChild(icon);
                li.appendChild(name);
                li = filesList.appendChild(li);
                li.addEventListener('click', cwdClickHandler);
            });
        });
}

function generateBreadcrumbs(server, directory) {
    const pathHeader = document.querySelector('.directory-listing-dialog .modal-body .current-directory');
    pathHeader.innerHTML = '';
    const dirs = directory.split('/').filter(dir => dir !== '');
    let separator = document.createElement('span');
        separator.classList.add('dir-breadcrumb-separator');
        separator = pathHeader.appendChild(separator);
    let breadcrumb = document.createElement('span');
        breadcrumb.classList.add('dir-breadcrumb');
        breadcrumb.setAttribute('path', '/');
        breadcrumb.innerHTML = 'root';
        breadcrumb = pathHeader.appendChild(breadcrumb);
        breadcrumb.addEventListener('click', (event) => {
            getDirectoryListing(server, '/');
        });
    if (dirs.length) {
        pathHeader.appendChild(separator.cloneNode(true));
    }

    pathHeader.setAttribute('current-path', directory);

    dirs.forEach((dir, index, arr) => {
        let path = '';
        let span = breadcrumb.cloneNode(true);
        for (let i = 0; i <= index; i++) {
            path += `/${arr[i]}`;
        }
        span.innerHTML = arr[index];
        span = pathHeader.appendChild(span);
        span.setAttribute('path', path);
        if (index !== arr.length - 1) {
            pathHeader.appendChild(separator.cloneNode(true));
        }
        span.addEventListener('click', (event) => {
            getDirectoryListing(server, event.target.getAttribute('path'));
        });
    });
}

