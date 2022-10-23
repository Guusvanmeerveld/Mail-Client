import useLocalStorageState from "use-local-storage-state";

import { FC } from "react";
import { Navigate } from "react-router-dom";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import InfoIcon from "@mui/icons-material/Info";
import LightModeIcon from "@mui/icons-material/LightMode";

import MailBox from "@interfaces/box";

import useStore from "@utils/hooks/useStore";
import useTheme from "@utils/hooks/useTheme";
import useUser from "@utils/hooks/useUser";

import DarkModeSwitch from "@components/DarkModeSwitch";
import Layout from "@components/Layout";
import LoginForm from "@components/Login/Form";
import LoginSettingsMenu from "@components/Login/Settings";

const Login: FC = () => {
	const theme = useTheme();

	const fetching = useStore((state) => state.fetching);

	const appVersion = useStore((state) => state.appVersion);
	const setShowAbout = useStore((state) => state.setShowAbout);

	const user = useUser();

	const [defaultBox] = useLocalStorageState<MailBox>("defaultBox");

	return (
		<>
			{fetching && (
				<Box sx={{ position: "fixed", width: 1, height: 2, top: 0 }}>
					<LinearProgress color="secondary" />
				</Box>
			)}
			{user.isLoggedIn && defaultBox?.id && (
				<Navigate to={`/dashboard/${defaultBox?.id}`} replace={true} />
			)}
			<Layout>
				<Box
					sx={{
						position: "fixed",
						left: theme.spacing(2),
						top: theme.spacing(2)
					}}
				>
					<Stack sx={{ alignItems: "center" }} direction="row" spacing={0.5}>
						<LightModeIcon />
						<DarkModeSwitch />
						<DarkModeIcon />
					</Stack>
				</Box>

				<LoginSettingsMenu />

				<Box
					sx={{
						textAlign: "center",
						width: "20rem",
						height: "100vh",
						display: "flex",
						alignItems: "center",
						m: "auto"
					}}
				>
					<LoginForm />
				</Box>
				<Box
					sx={{
						position: "fixed",
						right: theme.spacing(2),
						bottom: theme.spacing(2)
					}}
				>
					<Stack sx={{ alignItems: "center" }} direction="row" spacing={1}>
						<IconButton onClick={() => setShowAbout(true)}>
							<InfoIcon />
						</IconButton>
						<Typography>
							Version: {appVersion.title} ({appVersion.type})
						</Typography>
					</Stack>
				</Box>
			</Layout>
		</>
	);
};

export default Login;