"""
Содержимое файлов учебного сервера для задания №4 (Debian 12: OpenSSH, Apache 2.4,
MariaDB 10.11, PHP 8.2). Тексты сокращены, но сохраняют структуру и комментарии
настоящих конфигов — так поиск по ним выглядит как на реальном сервере.

Стартовое состояние намеренно небезопасное: root может входить по SSH, вход по паролю
включён (в sshd_config.d!), Apache сообщает версию ОС, MariaDB слушает все интерфейсы.
"""

SSHD_HEADER = """\
# This is the sshd server system-wide configuration file.  See
# sshd_config(5) for more information.

# This sshd was compiled with PATH=/usr/local/bin:/usr/bin:/bin:/usr/games

# The strategy used for options in the default sshd_config shipped with
# OpenSSH is to specify options with their default value where
# possible, but leave them commented.  Uncommented options override the
# default value.

Include /etc/ssh/sshd_config.d/*.conf

"""

SSHD_BODY = """\
#Port 22
#AddressFamily any
#ListenAddress 0.0.0.0
#ListenAddress ::

#HostKey /etc/ssh/ssh_host_rsa_key
#HostKey /etc/ssh/ssh_host_ecdsa_key
#HostKey /etc/ssh/ssh_host_ed25519_key

# Ciphers and keying
#RekeyLimit default none

# Logging
#SyslogFacility AUTH
#LogLevel INFO

# Authentication:

#LoginGraceTime 2m
{root_login}
#StrictModes yes
#MaxAuthTries 6
#MaxSessions 10

#PubkeyAuthentication yes

# Expect .ssh/authorized_keys2 to be disregarded by default in future.
#AuthorizedKeysFile	.ssh/authorized_keys .ssh/authorized_keys2

#AuthorizedPrincipalsFile none

# For this to work you will also need host keys in /etc/ssh/ssh_known_hosts
#HostbasedAuthentication no
# Change to yes if you don't trust ~/.ssh/known_hosts for
# HostbasedAuthentication
#IgnoreUserKnownHosts no
# Don't read the user's ~/.rhosts and ~/.shosts files
#IgnoreRhosts yes

# To disable tunneled clear text passwords, change to no here!
#PasswordAuthentication yes
#PermitEmptyPasswords no

# Change to yes to enable challenge-response passwords (beware issues with
# some PAM modules and threads)
KbdInteractiveAuthentication no

# Kerberos options
#KerberosAuthentication no
#KerberosOrLocalPasswd yes
#KerberosTicketCleanup yes

# GSSAPI options
#GSSAPIAuthentication no
#GSSAPICleanupCredentials yes

# Set this to 'yes' to enable PAM authentication, account processing,
# and session processing.
UsePAM yes

#AllowAgentForwarding yes
#AllowTcpForwarding yes
#GatewayPorts no
X11Forwarding yes
#X11DisplayOffset 10
#X11UseLocalhost yes
#PermitTTY yes
PrintMotd no
#PrintLastLog yes
#TCPKeepAlive yes
#PermitUserEnvironment no
#Compression delayed
#ClientAliveInterval 0
#ClientAliveCountMax 3
#UseDNS no
#PidFile /run/sshd.pid
#MaxStartups 10:30:100
#PermitTunnel no
#ChrootDirectory none
#VersionAddendum none

# no default banner path
#Banner none

# Allow client to pass locale environment variables
AcceptEnv LANG LC_*

# override default of no subsystems
Subsystem	sftp	/usr/lib/openssh/sftp-server

# Example of overriding settings on a per-user basis
#Match User anoncvs
#	X11Forwarding no
#	AllowTcpForwarding no
#	PermitTTY no
#	ForceCommand cvs server
"""

SSHD_CONFIG = SSHD_HEADER + SSHD_BODY.replace("{root_login}", "PermitRootLogin yes")
SSHD_TEMPLATE = SSHD_HEADER + SSHD_BODY.replace("{root_login}", "#PermitRootLogin prohibit-password")
SSHD_BACKUP = SSHD_HEADER + SSHD_BODY.replace("{root_login}", "PermitRootLogin yes").replace(
    "#Port 22", "Port 22")

SSHD_CLOUD_INIT = "PasswordAuthentication yes\n"

SSH_CONFIG = """\

# This is the ssh client system-wide configuration file.  See
# ssh_config(5) for more information.  This file provides defaults for
# users, and the values can be changed in per-user configuration files
# or on the command line.

# Configuration data is parsed as follows:
#  1. command line options
#  2. user-specific file
#  3. system-wide file
# Any configuration value is only changed the first time it is set.
# Thus, host-specific definitions should be at the beginning of the
# configuration file, and defaults at the end.

# Site-wide defaults for some commonly used options.  For a comprehensive
# list of available options, their meanings and defaults, please see the
# ssh_config(5) man page.

Include /etc/ssh/ssh_config.d/*.conf

Host *
#   ForwardAgent no
#   ForwardX11 no
#   ForwardX11Trusted yes
#   PasswordAuthentication yes
#   HostbasedAuthentication no
#   GSSAPIAuthentication no
#   GSSAPIDelegateCredentials no
#   GSSAPIKeyExchange no
#   GSSAPITrustDNS no
#   BatchMode no
#   CheckHostIP no
#   AddressFamily any
#   ConnectTimeout 0
#   StrictHostKeyChecking ask
#   IdentityFile ~/.ssh/id_rsa
#   IdentityFile ~/.ssh/id_dsa
#   IdentityFile ~/.ssh/id_ecdsa
#   IdentityFile ~/.ssh/id_ed25519
#   Port 22
#   Ciphers aes128-ctr,aes192-ctr,aes256-ctr,aes128-cbc,3des-cbc
#   MACs hmac-md5,hmac-sha1,umac-64@openssh.com
#   EscapeChar ~
#   Tunnel no
#   TunnelDevice any:any
#   PermitLocalCommand no
#   VisualHostKey no
#   ProxyCommand ssh -q -W %h:%p gateway.example.com
#   RekeyLimit 1G 1h
#   UserKnownHostsFile ~/.ssh/known_hosts.d/%k
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
"""

SSH_DEFAULT = """\
# Default settings for openssh-server. This file is sourced by /bin/sh from
# /etc/init.d/ssh.

# Options to pass to sshd
SSHD_OPTS=
"""

APACHE2_CONF = """\
# This is the main Apache server configuration file.  It contains the
# configuration directives that give the server its instructions.
# See http://httpd.apache.org/docs/2.4/ for detailed information about
# the directives and /usr/share/doc/apache2/README.Debian about Debian specific
# hints.
#
#
# Summary of how the Apache 2 configuration works in Debian:
# The Apache 2 web server configuration in Debian is quite different to
# upstream's suggested way to configure the web server. This is because Debian's
# default Apache2 installation attempts to make adding and removing modules,
# virtual hosts, and extra configuration directives as flexible as possible, in
# order to make automating the changes and administering the server as easy as
# possible.

# It is split into several files forming the configuration hierarchy outlined
# below, all located in the /etc/apache2/ directory:
#
#	/etc/apache2/
#	|-- apache2.conf
#	|	`--  ports.conf
#	|-- mods-enabled
#	|	|-- *.load
#	|	`-- *.conf
#	|-- conf-enabled
#	|	`-- *.conf
#	`-- sites-enabled
#		`-- *.conf
#
#
# * apache2.conf is the main configuration file (this file). It puts the pieces
#   together by including all remaining configuration files when starting up the
#   web server.
#
# * ports.conf is always included from the main configuration file. It is
#   supposed to determine listening ports for incoming connections which can be
#   customized anytime.
#
# * Configuration files in the mods-enabled/, conf-enabled/ and sites-enabled/
#   directories contain particular configuration snippets which manage modules,
#   global configuration fragments, or virtual host configurations,
#   respectively.
#
#   They are activated by symlinking available configuration files from their
#   respective *-available/ counterparts. These should be managed by using our
#   helpers a2enmod/a2dismod, a2ensite/a2dissite and a2enconf/a2disconf. See
#   their respective man pages for detailed information.

# Global configuration
#

#ServerRoot "/etc/apache2"

#
# The accept serialization lock file MUST BE STORED ON A LOCAL DISK.
#
#Mutex file:${APACHE_LOCK_DIR} default

#
# The directory where shm and other runtime files will be stored.
#

DefaultRuntimeDir ${APACHE_RUN_DIR}

#
# PidFile: The file in which the server should record its process
# identification number when it starts.
# This needs to be set in /etc/apache2/envvars
#
PidFile ${APACHE_PID_FILE}

#
# Timeout: The number of seconds before receives and sends time out.
#
Timeout 300

#
# KeepAlive: Whether or not to allow persistent connections (more than
# one request per connection). Set to "Off" to deactivate.
#
KeepAlive On

#
# MaxKeepAliveRequests: The maximum number of requests to allow
# during a persistent connection. Set to 0 to allow an unlimited amount.
# We recommend you leave this number high, for maximum performance.
#
MaxKeepAliveRequests 100

#
# KeepAliveTimeout: Number of seconds to wait for the next request from the
# same client on the same connection.
#
KeepAliveTimeout 5


# These need to be set in /etc/apache2/envvars
User ${APACHE_RUN_USER}
Group ${APACHE_RUN_GROUP}

#
# HostnameLookups: Log the names of clients or just their IP addresses
#
HostnameLookups Off

# ErrorLog: The location of the error log file.
ErrorLog ${APACHE_LOG_DIR}/error.log

#
# LogLevel: Control the severity of messages logged to the error_log.
#
LogLevel warn

# Include module configuration:
IncludeOptional mods-enabled/*.load
IncludeOptional mods-enabled/*.conf

# Include list of ports to listen on
Include ports.conf


# Sets the default security model of the Apache2 HTTPD server. It does
# not allow access to the root filesystem outside of /usr/share and /var/www.
<Directory />
	Options FollowSymLinks
	AllowOverride None
	Require all denied
</Directory>

<Directory /usr/share>
	AllowOverride None
	Require all granted
</Directory>

<Directory /var/www/>
	Options Indexes FollowSymLinks
	AllowOverride None
	Require all granted
</Directory>

# AccessFileName: The name of the file to look for in each directory
# for additional configuration directives.
AccessFileName .htaccess

#
# The following lines prevent .htaccess and .htpasswd files from being
# viewed by Web clients.
#
<FilesMatch "^\\.ht">
	Require all denied
</FilesMatch>


#
# The following directives define some format nicknames for use with
# a CustomLog directive.
#
LogFormat "%v:%p %h %l %u %t \\"%r\\" %>s %O \\"%{Referer}i\\" \\"%{User-Agent}i\\"" vhost_combined
LogFormat "%h %l %u %t \\"%r\\" %>s %O \\"%{Referer}i\\" \\"%{User-Agent}i\\"" combined
LogFormat "%h %l %u %t \\"%r\\" %>s %O" common
LogFormat "%{Referer}i -> %U" referer
LogFormat "%{User-agent}i" agent

# Include of directories ignores editors' and dpkg's backup files,
# see README.Debian for details.

# Include generic snippets of statements
IncludeOptional conf-enabled/*.conf

# Include the virtual host configurations:
IncludeOptional sites-enabled/*.conf
"""

PORTS_CONF = """\
# If you just change the port or add more ports here, you will likely also
# have to change the VirtualHost statement in
# /etc/apache2/sites-enabled/000-default.conf

Listen 80

<IfModule ssl_module>
	Listen 443
</IfModule>

<IfModule mod_gnutls.c>
	Listen 443
</IfModule>
"""

ENVVARS = """\
# envvars - default environment variables for apache2ctl

# this won't be correct after changing uid
unset HOME

# for supporting multiple apache2 instances
if [ "${APACHE_CONFDIR##/etc/apache2-}" != "${APACHE_CONFDIR}" ] ; then
	SUFFIX="-${APACHE_CONFDIR##/etc/apache2-}"
else
	SUFFIX=
fi

# Since there is no sane way to get the parsed apache2 config in scripts, some
# settings are defined via environment variables and then used in apache2ctl,
# /etc/init.d/apache2, /etc/logrotate.d/apache2, etc.
export APACHE_RUN_USER=www-data
export APACHE_RUN_GROUP=www-data
# temporary state file location. This might be changed to /run in Wheezy+1
export APACHE_PID_FILE=/var/run/apache2$SUFFIX/apache2.pid
export APACHE_RUN_DIR=/var/run/apache2$SUFFIX
export APACHE_LOCK_DIR=/var/lock/apache2$SUFFIX
# Only /var/log/apache2 is handled by /etc/logrotate.d/apache2.
export APACHE_LOG_DIR=/var/log/apache2$SUFFIX

## The locale used by some modules like mod_dav
export LANG=C

export LANG
"""

DEFAULT_SITE = """\
<VirtualHost *:80>
	# The ServerName directive sets the request scheme, hostname and port that
	# the server uses to identify itself. This is used when creating
	# redirection URLs. In the context of virtual hosts, the ServerName
	# specifies what hostname must appear in the request's Host: header to
	# match this virtual host. For the default virtual host (this file) this
	# value is not decisive as it is used as a last resort host regardless.
	# However, you must set it for any further virtual host explicitly.
	#ServerName www.example.com

	ServerAdmin webmaster@localhost
	DocumentRoot /var/www/html

	# Available loglevels: trace8, ..., trace1, debug, info, notice, warn,
	# error, crit, alert, emerg.
	# It is also possible to configure the loglevel for particular
	# modules, e.g.
	#LogLevel info ssl:warn

	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined

	# For most configuration files from conf-available/, which are
	# enabled or disabled at a global level, it is possible to
	# include a line for only one particular virtual host. For example the
	# following line enables the CGI configuration for this host only
	# after it has been globally disabled with "a2disconf".
	#Include conf-available/serve-cgi-bin.conf
</VirtualHost>
"""

DEFAULT_SSL_SITE = """\
<VirtualHost *:443>
	ServerAdmin webmaster@localhost

	DocumentRoot /var/www/html

	# Available loglevels: trace8, ..., trace1, debug, info, notice, warn,
	# error, crit, alert, emerg.
	# It is also possible to configure the loglevel for particular
	# modules, e.g.
	#LogLevel info ssl:warn

	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined

	#   SSL Engine Switch:
	#   Enable/Disable SSL for this virtual host.
	SSLEngine on

	#   A self-signed (snakeoil) certificate can be created by installing
	#   the ssl-cert package. See
	#   /usr/share/doc/apache2/README.Debian.gz for more info.
	#   If both key and certificate are stored in the same file, only the
	#   SSLCertificateFile directive is needed.
	SSLCertificateFile      /etc/ssl/certs/ssl-cert-snakeoil.pem
	SSLCertificateKeyFile   /etc/ssl/private/ssl-cert-snakeoil.key

	<FilesMatch "\\.(?:cgi|shtml|phtml|php)$">
		SSLOptions +StdEnvVars
	</FilesMatch>
	<Directory /usr/lib/cgi-bin>
		SSLOptions +StdEnvVars
	</Directory>
</VirtualHost>
"""

SECURITY_CONF = """\
#
# Disable access to the entire file system except for the directories that
# are explicitly allowed later.
#
# This currently breaks the configurations that come with some web application
# Debian packages.
#
#<Directory />
#   AllowOverride None
#   Require all denied
#</Directory>


# Changing the following options will not really affect the security of the
# server, but might make attacks slightly more difficult in some cases.

#
# ServerTokens
# This directive configures what you return as the Server HTTP response
# Header. The default is 'Full' which sends information about the OS-Type
# and compiled in modules.
# Set to one of:  Full | OS | Minimal | Minor | Major | Prod
# where Full conveys the most information, and Prod the least.
#ServerTokens Minimal
ServerTokens OS
#ServerTokens Full

#
# Optionally add a line containing the server version and virtual host
# name to server-generated pages (internal error documents, FTP directory
# listings, mod_status and mod_info output etc., but not CGI generated
# documents or custom error documents).
# Set to "EMail" to also include a mailto: link to the ServerAdmin.
# Set to one of:  On | Off | EMail
#ServerSignature Off
ServerSignature On

#
# Allow TRACE method
#
# Set to "extended" to also reflect the request body (only for testing and
# diagnostic purposes).
#
# Set to one of:  On | Off | extended
TraceEnable Off
#TraceEnable On

#
# Forbid access to version control directories
#
# If you use version control systems in your document root, you should
# probably deny access to their directories.
#
# Examples:
#
#RedirectMatch 404 /\\.git
#RedirectMatch 404 /\\.svn

# vim: syntax=apache ts=4 sw=4 sts=4 sr noet
"""

CHARSET_CONF = """\
# Read the documentation before enabling AddDefaultCharset.
# In general, it is only a good idea if you know that all your files
# have this encoding. It will override any encoding given in the files
# in meta http-equiv or xml encoding tags.

#AddDefaultCharset UTF-8

# vim: syntax=apache ts=4 sw=4 sts=4 sr noet
"""

OTHER_VHOSTS_LOG = """\
# Define an access log for VirtualHosts that don't define their own logfile
CustomLog ${APACHE_LOG_DIR}/other_vhosts_access.log vhost_combined

# vim: syntax=apache ts=4 sw=4 sts=4 sr noet
"""

SERVE_CGI = """\
<IfModule mod_alias.c>
	<IfModule mod_cgi.c>
		Define ENABLE_USR_LIB_CGI_BIN
	</IfModule>

	<IfModule mod_cgid.c>
		Define ENABLE_USR_LIB_CGI_BIN
	</IfModule>

	<IfDefine ENABLE_USR_LIB_CGI_BIN>
		ScriptAlias /cgi-bin/ /usr/lib/cgi-bin/
		<Directory "/usr/lib/cgi-bin">
			AllowOverride None
			Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
			Require all granted
		</Directory>
	</IfDefine>
</IfModule>

# vim: syntax=apache ts=4 sw=4 sts=4 sr noet
"""

MODS = {
    "dir.conf": "<IfModule mod_dir.c>\n\tDirectoryIndex index.html index.cgi index.pl index.php index.xhtml index.htm\n</IfModule>\n",
    "dir.load": "LoadModule dir_module /usr/lib/apache2/modules/mod_dir.so\n",
    "status.conf": (
        "<IfModule mod_status.c>\n\t# Allow server status reports generated by mod_status,\n"
        "\t# with the URL of http://servername/server-status\n\t<Location /server-status>\n"
        "\t\tSetHandler server-status\n\t\tRequire local\n\t</Location>\n\n\tExtendedStatus On\n</IfModule>\n"
    ),
    "status.load": "LoadModule status_module /usr/lib/apache2/modules/mod_status.so\n",
    "php8.2.conf": (
        "<FilesMatch \".+\\.ph(?:ar|p|tml)$\">\n    SetHandler application/x-httpd-php\n</FilesMatch>\n"
        "<FilesMatch \".+\\.phps$\">\n    SetHandler application/x-httpd-php-source\n    Require all denied\n</FilesMatch>\n"
    ),
    "php8.2.load": "LoadModule php_module /usr/lib/apache2/modules/libphp8.2.so\n",
    "ssl.conf": "<IfModule mod_ssl.c>\n\tSSLRandomSeed startup builtin\n\tSSLRandomSeed connect builtin\n\tSSLProtocol all -SSLv3\n</IfModule>\n",
    "ssl.load": "LoadModule ssl_module /usr/lib/apache2/modules/mod_ssl.so\n",
    "rewrite.load": "LoadModule rewrite_module /usr/lib/apache2/modules/mod_rewrite.so\n",
}
MODS_ENABLED = ["dir.conf", "dir.load", "status.conf", "status.load", "php8.2.conf", "php8.2.load"]

MY_CNF = """\
# The MariaDB configuration file
#
# The MariaDB/MySQL tools read configuration files in the following order:
# 0. "/etc/mysql/my.cnf" symlinks to this file, reason why all the rest is read.
# 1. "/etc/mysql/mariadb.cnf" (this file) to set global defaults,
# 2. "/etc/mysql/conf.d/*.cnf" to set global options.
# 3. "/etc/mysql/mariadb.conf.d/*.cnf" to set MariaDB-only options.
# 4. "~/.my.cnf" to set user-specific options.
#
# If the same option is defined multiple times, the last one will apply.
#
# One can use all long options that the program supports.
# Run program with --help to get a list of available options and with
# --print-defaults to see which it would actually understand and use.
#
# If you are new to MariaDB, check out https://mariadb.com/kb/en/basic-mariadb-articles/

#
# This group is read both by the client and the server
# use it for options that affect everything
#
[client-server]
# Port or socket location where to connect
# port = 3306
socket = /run/mysqld/mysqld.sock

# Import all .cnf files from configuration directory
!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mariadb.conf.d/
"""

MY_CNF_FALLBACK = """\
#
# The MySQL database server configuration file.
#
# You can copy this to one of:
# - "/etc/mysql/my.cnf" to set global options,
# - "~/.my.cnf" to set user-specific options.
#
# One can use all long options that the program supports.
# Run program with --help to get a list of available options and with
# --print-defaults to see which it would actually understand and use.
#
# For explanations see
# http://dev.mysql.com/doc/mysql/en/server-system-variables.html

# This will be passed to all mysql clients
# It has been reported that passwords should be enclosed with ticks/quotes
# escpecially if they contain "#" chars...
# Remember to edit /etc/mysql/debian.cnf when changing the socket location.

# Here is entries for some specific programs
# The following values assume you have at least 32M ram

[mysqld]
bind-address = 0.0.0.0

!includedir /etc/mysql/conf.d/
"""

DEBIAN_CNF = """\
# THIS FILE IS OBSOLETE. STOP USING IT IF POSSIBLE.
# This file exists only for backwards compatibility for
# tools that run '--defaults-file=/etc/mysql/debian.cnf'
# and have root level access to the local filesystem.
# With those permissions one can run 'mariadb' directly
# anyway thanks to unix socket authentication and hence
# this file is useless. See package README for more info.
[client]
host     = localhost
user     = root
password = {db_password}
[mysql_upgrade]
host     = localhost
user     = root
password = {db_password}
# THIS FILE WILL BE REMOVED IN A FUTURE DEBIAN RELEASE.
"""

MARIADB_SERVER = """\
#
# These groups are read by MariaDB server.
# Use it for options that only the server (but not clients) should see

# this is read by the standalone daemon and embedded servers
[server]

# this is only for the mysqld standalone daemon
[mysqld]

#
# * Basic Settings
#

#user                    = mysql
pid-file                = /run/mysqld/mysqld.pid
basedir                 = /usr
#datadir                 = /var/lib/mysql
#tmpdir                  = /tmp

# Broken reverse DNS slows down connections considerably and name resolve is
# safe to skip if there are no "host by domain name" access grants
#skip-name-resolve

# Instead of skip-networking the default is now to listen only on
# localhost which is more compatible and is not less secure.
bind-address            = 0.0.0.0

#
# * Fine Tuning
#

#key_buffer_size        = 128M
#max_allowed_packet     = 1G
#thread_stack           = 192K
#thread_cache_size      = 8
# This replaces the startup script and checks MyISAM tables if needed
# the first time they are touched
#myisam_recover_options = BACKUP
#max_connections        = 100
#table_cache            = 64

#
# * Logging and Replication
#

# Note: The configured log file or its directory need to be created
# and be writable by the mysql user, e.g.:
# $ sudo mkdir -m 2750 /var/log/mysql
# $ sudo chown mysql /var/log/mysql

# Both location gets rotated by the cronjob.
# Be aware that this log type is a performance killer.
# Recommend only changing this at runtime for short testing periods if needed!
#general_log_file       = /var/log/mysql/mysql.log
#general_log            = 1

# When running under systemd, error logging goes via stdout/stderr to journald
# and when running legacy init error logging goes to syslog due to
# /etc/mysql/conf.d/mariadb.conf.d/50-mysqld_safe.cnf
# Enable this if you want to have error logging into a separate file
#log_error = /var/log/mysql/error.log
# Enable the slow query log to see queries with especially long duration
#log_slow_query_file    = /var/log/mysql/mariadb-slow.log
#log_slow_query_time    = 10
#log_slow_verbosity     = query_plan,explain
#log-queries-not-using-indexes
#log_slow_min_examined_row_limit = 1000

#
# * Character sets
#

# MySQL/MariaDB default is Latin1, but in Debian we rather default to the full
# utf8 4-byte character set. See also client.cnf
character-set-server     = utf8mb4
collation-server         = utf8mb4_general_ci

#
# * InnoDB
#

# InnoDB is enabled by default with a 10MB datafile in /var/lib/mysql/.
# Read the manual for more InnoDB related options. There are many!
# Most important is to give InnoDB 80 % of the system RAM for buffer use:
# https://mariadb.com/kb/en/innodb-system-variables/#innodb_buffer_pool_size
#innodb_buffer_pool_size = 8G

# this is only for embedded server
[embedded]

# This group is only read by MariaDB servers, not by MySQL.
# If you use the same .cnf file for MySQL and MariaDB,
# you can put MariaDB-only options here
[mariadb]

# This group is only read by MariaDB-10.11 servers.
# If you use the same .cnf file for MariaDB of different versions,
# use this group for options that older servers don't understand
[mariadb-10.11]
"""

MARIADB_CLIENT = """\
#
# This group is read by the client library
# Use it for options that affect all clients, but not the server
#

[client]
# Example of client certificate usage
#ssl-cert = /etc/mysql/client-cert.pem
#ssl-key  = /etc/mysql/client-key.pem
#
# Allow only TLS encrypted connections
#ssl-verify-server-cert = on

# This group is *never* read by mysql client library, though this
# /etc/mysql/mariadb.cnf.d/client.cnf file is not read by Oracle MySQL
# client anyway.
# If you use the same .cnf file for MySQL and MariaDB,
# use it for MariaDB-only client options
[client-mariadb]
"""

MARIADB_CLIENTS = """\
#
# These groups are read by MariaDB command-line tools
# Use it for options that affect only one utility
#

[mysql]

[mysql_upgrade]

[mysqladmin]

[mysqlbinlog]

[mysqlcheck]

[mysqldump]

[mysqlimport]

[mysqlshow]

[mysqlslap]
"""

MARIADB_SAFE = """\
# NOTE: This file is read only by the traditional SysV init script, not systemd.
# MariaDB systemd does _not_ utilize mysqld_safe nor read this file.
#
# For similar behavior, systemd users should create the following file:
# /etc/systemd/system/mariadb.service.d/migrated-from-my.cnf-settings.conf

[mysqld_safe]
socket		= /run/mysqld/mysqld.sock
nice		= 0
skip_log_error
syslog
"""

MARIADB_GALERA = """\
#
# * Galera-related settings
#
# See the examples of server wsrep.cnf files in /usr/share/mysql
# and read more at https://mariadb.com/kb/en/galera-cluster/

[galera]
# Mandatory settings
#wsrep_on                 = ON
#wsrep_cluster_name       = "MariaDB Galera Cluster"
#wsrep_cluster_address    = gcomm://
#binlog_format            = row
#default_storage_engine   = InnoDB
#innodb_autoinc_lock_mode = 2

# Allow server to accept connections on all interfaces.
#bind-address = 0.0.0.0

# Optional settings
#wsrep_slave_threads = 1
#innodb_flush_log_at_trx_commit = 0
"""

MYSQL_CONF_D = {
    "mysql.cnf": "[mysql]\n",
    "mysqldump.cnf": "[mysqldump]\nquick\nquote-names\nmax_allowed_packet	= 16M\n",
}


def php_ini(sapi):
    """php.ini: для CLI memory_limit = -1, как в Debian."""
    memory = "-1" if sapi == "cli" else "128M"
    return f"""\
[PHP]

;;;;;;;;;;;;;;;;;;;
; About php.ini   ;
;;;;;;;;;;;;;;;;;;;
; PHP's initialization file, generally called php.ini, is responsible for
; configuring many of the aspects of PHP's behavior.

; PHP attempts to find and load this configuration from a number of locations.
; The following is a summary of its search order:
; 1. SAPI module specific location.
; 2. The PHPRC environment variable.
; 3. A number of predefined registry keys on Windows
; 4. Current working directory (except CLI)
; 5. The web server's directory (for SAPI modules), or directory of PHP
; (otherwise in Windows)
; 6. The directory from the --with-config-file-path compile time option, or the
; Windows directory (usually C:\\windows)
; See the PHP docs for more specific information.
; https://php.net/configuration.file

; The syntax of the file is extremely simple.  Whitespace and lines
; beginning with a semicolon are silently ignored (as you probably guessed).

;;;;;;;;;;;;;;;;;;;;
; Language Options ;
;;;;;;;;;;;;;;;;;;;;

; Enable the PHP scripting language engine under Apache.
; https://php.net/engine
engine = On

; This directive determines whether or not PHP will recognize code between
; <? and ?> tags as PHP source which should be processed as such.
short_open_tag = Off

; The number of significant digits displayed in floating point numbers.
; https://php.net/precision
precision = 14

; Output buffering is a mechanism for controlling how much output data
; (excluding headers and cookies) PHP should keep internally before pushing that
; data to the client.
output_buffering = 4096

; Decides whether PHP may expose the fact that it is installed on the server
; (e.g. by adding its signature to the Web server header).  It is no security
; threat in any way, but it makes it possible to determine whether you use PHP
; on your server or not.
; https://php.net/expose-php
expose_php = Off

;;;;;;;;;;;;;;;;;;;
; Resource Limits ;
;;;;;;;;;;;;;;;;;;;

; Maximum execution time of each script, in seconds
; https://php.net/max-execution-time
; Note: This directive is hardcoded to 0 for the CLI SAPI
max_execution_time = 30

; Maximum amount of time each script may spend parsing request data.
; https://php.net/max-input-time
max_input_time = 60

; Maximum amount of memory a script may consume
; https://php.net/memory-limit
memory_limit = {memory}

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
; Error handling and logging ;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

; Default Value: E_ALL
; Development Value: E_ALL
; Production Value: E_ALL & ~E_DEPRECATED & ~E_STRICT
; https://php.net/error-reporting
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT

; This directive controls whether or not and where PHP will output errors,
; notices and warnings too.
; https://php.net/display-errors
display_errors = Off

; The display of errors which occur during PHP's startup sequence are handled
; separately from display_errors.
display_startup_errors = Off

; Besides displaying errors, PHP can also log errors to locations such as a
; server-specific log, STDERR, or a location specified by the error_log
; directive found below.
log_errors = On

;;;;;;;;;;;;;;;;;
; Data Handling ;
;;;;;;;;;;;;;;;;;

; Maximum size of POST data that PHP will accept.
; Its value may be 0 to disable the limit. It is ignored if POST data reading
; is disabled through enable_post_data_reading.
; https://php.net/post-max-size
post_max_size = 8M

; Default MIME type
default_mimetype = "text/html"

; PHP's default character set is set to UTF-8.
default_charset = "UTF-8"

;;;;;;;;;;;;;;;;
; File Uploads ;
;;;;;;;;;;;;;;;;

; Whether to allow HTTP file uploads.
; https://php.net/file-uploads
file_uploads = On

; Temporary directory for HTTP uploaded files (will use system default if not
; specified).
; https://php.net/upload-tmp-dir
;upload_tmp_dir =

; Maximum allowed size for uploaded files.
; https://php.net/upload-max-filesize
upload_max_filesize = 2M

; Maximum number of files that can be uploaded via a single request
max_file_uploads = 20

;;;;;;;;;;;;;;;;;;
; Fopen wrappers ;
;;;;;;;;;;;;;;;;;;

; Whether to allow the treatment of URLs (like http:// or ftp://) as files.
; https://php.net/allow-url-fopen
allow_url_fopen = On

; Whether to allow include/require to open URLs (like https:// or ftp://) as files.
; https://php.net/allow-url-include
allow_url_include = Off

; Default timeout for socket based streams (seconds)
; https://php.net/default-socket-timeout
default_socket_timeout = 60

[Date]
; Defines the default timezone used by the date functions
; https://php.net/date.timezone
;date.timezone =

[Session]
; Handler used to store/retrieve data.
; https://php.net/session.save-handler
session.save_handler = files

; Name of the session (used as cookie name).
; https://php.net/session.name
session.name = PHPSESSID

; Whether to use cookies.
; https://php.net/session.use-cookies
session.use_cookies = 1

; https://php.net/session.cookie-secure
;session.cookie_secure =

; Lifetime in seconds of cookie or, if 0, until browser is restarted.
; https://php.net/session.cookie-lifetime
session.cookie_lifetime = 0

; Whether or not to add the httpOnly flag to the cookie, which makes it
; inaccessible to browser scripting languages such as JavaScript.
; https://php.net/session.cookie-httponly
session.cookie_httponly =

[opcache]
; Determines if Zend OPCache is enabled
;opcache.enable=1

; Determines if Zend OPCache is enabled for the CLI version of PHP
;opcache.enable_cli=0

; The OPcache shared memory storage size.
;opcache.memory_consumption=128
"""


PHP_MODS = {
    "opcache.ini": "; configuration for php opcache module\n; priority=10\nzend_extension=opcache.so\n",
    "pdo.ini": "; configuration for php common module\n; priority=10\nextension=pdo.so\n",
    "mysqli.ini": "; configuration for php mysql module\n; priority=20\nextension=mysqli.so\n",
    "pdo_mysql.ini": "; configuration for php mysql module\n; priority=20\nextension=pdo_mysql.so\n",
}
PHP_CONF_D = {"10-opcache.ini": "opcache.ini", "10-pdo.ini": "pdo.ini", "20-mysqli.ini": "mysqli.ini",
              "20-pdo_mysql.ini": "pdo_mysql.ini"}

LOGROTATE_APACHE = """\
/var/log/apache2/*.log {
	daily
	missingok
	rotate 14
	compress
	delaycompress
	notifempty
	create 640 root adm
	sharedscripts
	prerotate
		if [ -d /etc/logrotate.d/httpd-prerotate ]; then
			run-parts /etc/logrotate.d/httpd-prerotate
		fi
	endscript
	postrotate
		if pgrep -f ^/usr/sbin/apache2 > /dev/null; then
			invoke-rc.d apache2 reload 2>&1 | logger -t apache2.logrotate
		fi
	endscript
}
"""

LOGROTATE_MARIADB = """\
/var/log/mysql/mysql.log /var/log/mysql/mysql-slow.log /var/log/mysql/mariadb-slow.log /var/log/mysql/error.log {
	su mysql mysql
	missingok
	create 660 mysql mysql
	notifempty
	daily
	minsize 1M # only use with logrotate >= 3.7.4
	maxsize 100M # only use with logrotate >= 3.8.1
	rotate 30
	compress
	delaycompress
	sharedscripts
}
"""

CRON_PHP = """\
# /etc/cron.d/php@PHP_VERSION@: crontab fragment for PHP
#  This purges session files in session.save_path older than X,
#  where X is defined in seconds as the largest value of
#  session.gc_maxlifetime from all your SAPI php.ini files
#  or 24 minutes if not defined.  The script triggers only
#  when session.save_handler=files.

09,39 *     * * *     root   [ -x /usr/lib/php/sessionclean ] && if [ ! -d /run/systemd/system ]; then /usr/lib/php/sessionclean; fi
"""

CRONTAB = """\
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  * user-name command to be executed
17 *	* * *	root	cd / && run-parts --report /etc/cron.hourly
25 6	* * *	root	test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.daily; }
47 6	* * 7	root	test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.weekly; }
52 6	1 * *	root	test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.monthly; }
"""

FSTAB = """\
# /etc/fstab: static file system information.
#
# Use 'blkid' to print the universally unique identifier for a
# device; this may be used with UUID= as a more robust way to name devices
# that works even if disks are added and removed. See fstab(5).
#
# systemd generates mount units based on this file, see systemd.mount(5).
# Please run 'systemctl daemon-reload' after making changes here.
#
# <file system> <mount point>   <type>  <options>       <dump>  <pass>
# / was on /dev/vda1 during installation
UUID=6f1c2a9e-3b7d-4f61-9a2e-0c5d8e4b7a13 /               ext4    errors=remount-ro 0       1
# swap was on /dev/vda5 during installation
UUID=0b9e7c44-1d2f-4a8e-b6c3-5e7f9a1d2c48 none            swap    sw              0       0
"""

OS_RELEASE = """\
PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"
NAME="Debian GNU/Linux"
VERSION_ID="12"
VERSION="12 (bookworm)"
VERSION_CODENAME=bookworm
ID=debian
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/"
"""

SYSCTL = """\
#
# /etc/sysctl.conf - Configuration file for setting system variables
# See /etc/sysctl.d/ for additional system variables.
# See sysctl.conf (5) for information.
#

#kernel.domainname = example.com

# Uncomment the following to stop low-level messages on console
#kernel.printk = 3 4 1 3

###################################################################
# Functions previously found in netbase
#

# Uncomment the next two lines to enable Spoof protection (reverse-path filter)
# Turn on Source Address Verification in all interfaces to
# prevent some spoofing attacks
#net.ipv4.conf.default.rp_filter=1
#net.ipv4.conf.all.rp_filter=1

# Uncomment the next line to enable TCP/IP SYN cookies
# See http://lwn.net/Articles/277146/
# Note: This may impact IPv6 TCP sessions too
#net.ipv4.tcp_syncookies=1

# Uncomment the next line to enable packet forwarding for IPv4
#net.ipv4.ip_forward=1
"""

LIMITS_CONF = """\
# /etc/security/limits.conf
#
#Each line describes a limit for a user in the form:
#
#<domain>        <type>  <item>  <value>
#
#*               soft    core            0
#root            hard    core            100000
#*               hard    rss             10000
#@student        hard    nproc           20
#@faculty        soft    nproc           20
#@faculty        hard    nproc           50
#ftp             hard    nproc           0
#ftp             -       chroot          /ftp
#@student        -       maxlogins       4

# End of file
"""

BASHRC = """\
# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

HISTCONTROL=ignoreboth
HISTSIZE=1000
HISTFILESIZE=2000

alias ls='ls --color=auto'
alias grep='grep --color=auto'
alias ll='ls -alF'
"""

PROFILE = """\
# ~/.profile: executed by the command interpreter for login shells.

if [ -n "$BASH_VERSION" ]; then
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi
"""

BASH_HISTORY = """\
ls
cat /etc/hostname
sudo systemctl status apache2
ls /etc
cat /etc/os-release
sudo systemctl status ssh
mkdir backup
ls -la backup
df -h
free -m
sudo systemctl restart mariadb
history
"""

NOTES = """\
Заметки прошлого администратора
================================

- Сервер: Debian 12, на нём SSH, Apache + PHP и MariaDB.
- Все настройки сервисов — в /etc. Где именно какой файл, уже не помню :(
- Перед изменениями я делал копии в ~/backup и /var/backups — их не трогать.
- После правки конфига стоит проверить, что значение действительно изменилось (grep).
"""

INDEX_HTML = """\
<!DOCTYPE html>
<html>
<head><title>Apache2 Debian Default Page: It works</title></head>
<body>
<h1>It works!</h1>
<p>This is the default welcome page used to test the correct operation of the
Apache2 server after installation on Debian systems.</p>
</body>
</html>
"""

INFO_PHP = "<?php\nphpinfo();\n"

SYSTEMD_UNITS = {
    "ssh.service": (
        "[Unit]\nDescription=OpenBSD Secure Shell server\nDocumentation=man:sshd(8) man:sshd_config(5)\n"
        "After=network.target auditd.service\n\n[Service]\nEnvironmentFile=-/etc/default/ssh\n"
        "ExecStartPre=/usr/sbin/sshd -t\nExecStart=/usr/sbin/sshd -D $SSHD_OPTS\nExecReload=/bin/kill -HUP $MAINPID\n"
        "Restart=on-failure\n\n[Install]\nWantedBy=multi-user.target\nAlias=sshd.service\n"
    ),
    "apache2.service": (
        "[Unit]\nDescription=The Apache HTTP Server\nAfter=network.target remote-fs.target nss-lookup.target\n"
        "Documentation=https://httpd.apache.org/docs/2.4/\n\n[Service]\nType=forking\nEnvironment=APACHE_STARTED_BY_SYSTEMD=true\n"
        "ExecStart=/usr/sbin/apachectl start\nExecStop=/usr/sbin/apachectl graceful-stop\nExecReload=/usr/sbin/apachectl graceful\n"
        "PrivateTmp=true\nRestart=on-abort\n\n[Install]\nWantedBy=multi-user.target\n"
    ),
    "mariadb.service": (
        "[Unit]\nDescription=MariaDB 10.11.6 database server\nDocumentation=man:mariadbd(8)\n"
        "After=network.target\n\n[Service]\nType=notify\nUser=mysql\nGroup=mysql\n"
        "ExecStart=/usr/sbin/mariadbd $MYSQLD_OPTS\nRestart=on-abort\n\n[Install]\nWantedBy=multi-user.target\n"
    ),
}

APACHE_README = """\
Contents
========

	Apache2 Configuration under Debian GNU/Linux
		Files and Directories in '/etc/apache2'
		Tools

Apache2 Configuration under Debian GNU/Linux
============================================

Debian's default Apache2 installation attempts to make adding and removing
modules, virtual hosts, and extra configuration directives as flexible as
possible, in order to make automating the changes and administering the server
as easy as possible.

Files and Directories in '/etc/apache2':
----------------------------------------

apache2.conf
	This is the main configuration file.

ports.conf
	Configuration directives for which ports and IP addresses to
	listen to.

sites-available/
	Configuration files in this directory are for virtual hosts. They are
	activated by symlinking them into sites-enabled/ with a2ensite.

sites-enabled/
	Similar in functionality to conf-enabled/, this directory contains
	symlinks to sites in sites-available/ which the administrator wishes to
	enable.
"""

PORTS_EXAMPLE = PORTS_CONF.replace("Listen 80", "Listen 8080")

AUTH_LOG = """\
{d} seclab sshd[812]: Server listening on 0.0.0.0 port 22.
{d} seclab sshd[812]: Server listening on :: port 22.
{d} seclab sshd[1403]: Failed password for root from 185.220.101.4 port 51122 ssh2
{d} seclab sshd[1403]: Failed password for root from 185.220.101.4 port 51122 ssh2
{d} seclab sshd[1410]: Accepted password for root from 10.0.2.2 port 49812 ssh2
{d} seclab sshd[1410]: pam_unix(sshd:session): session opened for user root(uid=0) by (uid=0)
{d} seclab sudo: {user} : TTY=pts/0 ; PWD=/home/{user} ; USER=root ; COMMAND=/usr/bin/systemctl status apache2
"""

ACCESS_LOG = """\
10.0.2.2 - - [{d}] "GET / HTTP/1.1" 200 3380 "-" "Mozilla/5.0 (X11; Linux x86_64)"
10.0.2.2 - - [{d}] "GET /info.php HTTP/1.1" 200 81233 "-" "Mozilla/5.0 (X11; Linux x86_64)"
45.155.205.7 - - [{d}] "GET /.env HTTP/1.1" 404 437 "-" "curl/7.88.1"
45.155.205.7 - - [{d}] "GET /wp-login.php HTTP/1.1" 404 437 "-" "curl/7.88.1"
"""

ERROR_LOG = """\
[{d}] [mpm_prefork:notice] [pid 901] AH00163: Apache/2.4.62 (Debian) configured -- resuming normal operations
[{d}] [core:notice] [pid 901] AH00094: Command line: '/usr/sbin/apache2'
"""
