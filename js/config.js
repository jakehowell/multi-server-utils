// This is a sample configuration file for the serverutils project. This is where you can define the different server configurations that are managed by the utility app.
// It is assumed that a shared SSH key is configured that will allow connections to servers, but this could easily be modified to use a password instead.

const config = {
	mysql: {
		host: "localhost",
		user: "root",
		password: "develop",
		db: "serverutils",
		port: 3306
	},
	servers: [
		{
			name: "beta-1",
			user: "admin",
			env: "beta",
			hostname: ""
		},
		{
			name: "beta-2",
			user: "admin",
			env: "beta",
			hostname: ""
		},
		{
			name: "api-1",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "api-2",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "api-3",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "api-4",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "api-5",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "api-6",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "backend-1",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "backend-2",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "backend-3",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "backend-4",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "frontend-1",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "frontend-2",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "frontend-3",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "frontend-4",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "frontend-5",
			user: "admin",
			env: "production",
			hostname: ""
		},
		{
			name: "frontend-6",
			user: "admin",
			env: "production",
			hostname: ""
		}
	],
};

export {config};
