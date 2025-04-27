import testinfra.utils.ansible_runner

# Use Ansible inventory for production host
testinfra_hosts = testinfra.utils.ansible_runner.AnsibleRunner(
    'infra/inventory/production.yml'
).get_hosts('all')

def test_nginx_installed(host):
    # Проверяем, что nginx установлен
    nginx = host.package('nginx')
    assert nginx.is_installed

def test_nginx_running_and_enabled(host):
    # Проверяем, что сервис nginx запущен и включён
    service = host.service('nginx')
    assert service.is_running
    assert service.is_enabled

def test_port_80_listening(host):
    # Проверяем, что порт 80 слушает
    socket = host.socket('tcp://0.0.0.0:80')
    assert socket.is_listening

# Add more tests as needed... 